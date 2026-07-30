package com.fawn.nfc

import android.app.Activity
import android.content.Context
import android.content.pm.PackageManager
import android.nfc.NfcAdapter
import android.nfc.tech.IsoDep
import android.os.SystemClock
import android.provider.Settings
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.nio.ByteBuffer
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.spec.ECGenParameterSpec
import java.util.UUID

class FawnNfcModule : Module() {
  @Volatile
  private var readerAdapter: NfcAdapter? = null
  @Volatile
  private var readerStartedAtMs: Long = 0

  override fun definition() = ModuleDefinition {
    Name("FawnNfc")

    Events("onHceResponse", "onHceError")

    Function("isSupported") {
      val context = appContext.reactContext ?: return@Function false
      context.packageManager.hasSystemFeature(PackageManager.FEATURE_NFC_HOST_CARD_EMULATION)
    }

    Function("isNfcEnabled") {
      val context = appContext.reactContext ?: return@Function false
      NfcAdapter.getDefaultAdapter(context)?.isEnabled == true
    }

    Function("getDeviceName") {
      val context = appContext.reactContext ?: return@Function "Android device"
      Settings.Global.getString(context.contentResolver, Settings.Global.DEVICE_NAME)
        ?: android.os.Build.MODEL
        ?: "Android device"
    }

    AsyncFunction("getOrCreatePublicKeyAsync") {
      ensureKeyPair()
      val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
      val publicKey = keyStore.getCertificate(KEY_ALIAS).publicKey.encoded
      Base64.encodeToString(publicKey, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
    }

    AsyncFunction("configureDeviceAsync") { deviceId: String ->
      UUID.fromString(deviceId)
      ensureKeyPair()
      requireContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(DEVICE_ID, deviceId)
        .apply()
    }

    AsyncFunction("clearDeviceAsync") {
      requireContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
      val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
      if (keyStore.containsAlias(KEY_ALIAS)) keyStore.deleteEntry(KEY_ALIAS)
    }

    AsyncFunction("startReaderAsync") { challengeB64: String ->
      val challenge = Base64.decode(challengeB64, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)
      require(challenge.size == CHALLENGE_SIZE) { "FAWN NFC challenge must be 32 bytes" }
      val activity = appContext.currentActivity ?: error("A foreground Android activity is required")
      val adapter = NfcAdapter.getDefaultAdapter(activity) ?: error("This device has no NFC adapter")
      require(adapter.isEnabled) { "Turn on NFC before starting the reader" }
      readerAdapter = adapter
      readerStartedAtMs = SystemClock.elapsedRealtime()
      activity.runOnUiThread {
        adapter.enableReaderMode(
          activity,
          { tag -> readCredential(tag, challenge, activity) },
          NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_NFC_B or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
          null,
        )
      }
    }

    AsyncFunction("stopReaderAsync") {
      stopReader()
    }
  }

  private fun requireContext(): Context = appContext.reactContext ?: error("Android context is unavailable")

  private fun ensureKeyPair() {
    val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
    if (keyStore.containsAlias(KEY_ALIAS)) return
    val generator = KeyPairGenerator.getInstance(KeyProperties.KEY_ALGORITHM_EC, KEYSTORE)
    val spec = KeyGenParameterSpec.Builder(KEY_ALIAS, KeyProperties.PURPOSE_SIGN)
      .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
      .setDigests(KeyProperties.DIGEST_SHA256)
      .setUserAuthenticationRequired(false)
      .build()
    generator.initialize(spec)
    generator.generateKeyPair()
  }

  private fun readCredential(tag: android.nfc.Tag, challenge: ByteArray, activity: Activity) {
    val apduStartedAtMs = SystemClock.elapsedRealtime()
    try {
      val isoDep = IsoDep.get(tag) ?: error("The tapped device does not support ISO-DEP")
      isoDep.use {
        it.connect()
        it.timeout = 3_000
        requireSuccess(it.transceive(selectAidApdu()))
        val response = it.transceive(challengeApdu(challenge))
        requireSuccess(response)
        val payload = response.copyOfRange(0, response.size - 2)
        require(payload.size >= 19 && payload[0].toInt() == PROTOCOL_VERSION) { "Unsupported FAWN NFC response" }
        val buffer = ByteBuffer.wrap(payload)
        buffer.get()
        val most = buffer.long
        val least = buffer.long
        val signatureLength = buffer.short.toInt() and 0xffff
        require(signatureLength in 64..80 && buffer.remaining() == signatureLength) { "Invalid FAWN NFC signature envelope" }
        val signature = ByteArray(signatureLength).also { buffer.get(it) }
        val apduRoundTripMs = (SystemClock.elapsedRealtime() - apduStartedAtMs).coerceAtLeast(0)
        val readerWaitMs = (apduStartedAtMs - readerStartedAtMs).coerceAtLeast(0)
        sendEvent("onHceResponse", mapOf(
          "deviceId" to UUID(most, least).toString(),
          "signatureB64" to Base64.encodeToString(signature, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING),
          "signatureBytes" to signature.size,
          "readerWaitMs" to readerWaitMs,
          "apduRoundTripMs" to apduRoundTripMs,
          "tagTechnologies" to tag.techList.toList(),
        ))
      }
    } catch (error: Exception) {
      val readerElapsedMs = if (readerStartedAtMs > 0) (SystemClock.elapsedRealtime() - readerStartedAtMs).coerceAtLeast(0) else 0
      sendEvent("onHceError", mapOf(
        "message" to (error.message ?: "Could not read FAWN NFC credential"),
        "readerElapsedMs" to readerElapsedMs,
      ))
    } finally {
      stopReader()
    }
  }

  private fun stopReader() {
    val activity = appContext.currentActivity ?: return
    activity.runOnUiThread {
      readerAdapter?.disableReaderMode(activity)
      readerAdapter = null
      readerStartedAtMs = 0
    }
  }

  private fun selectAidApdu(): ByteArray {
    val aid = hexToBytes(HCE_AID)
    return byteArrayOf(0x00, 0xA4.toByte(), 0x04, 0x00, aid.size.toByte()) + aid + byteArrayOf(0x00)
  }

  private fun challengeApdu(challenge: ByteArray): ByteArray =
    byteArrayOf(0x80.toByte(), 0x10, 0x00, 0x00, challenge.size.toByte()) + challenge + byteArrayOf(0x00)

  private fun requireSuccess(response: ByteArray) {
    require(response.size >= 2 && response[response.size - 2] == 0x90.toByte() && response.last() == 0x00.toByte()) {
      "FAWN NFC credential rejected the terminal challenge"
    }
  }

  private fun hexToBytes(value: String): ByteArray =
    value.chunked(2).map { it.toInt(16).toByte() }.toByteArray()

  companion object {
    private const val KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "fawn_hce_signing_v1"
    private const val PREFS = "fawn_hce"
    private const val DEVICE_ID = "device_id"
    private const val HCE_AID = "F04641574E0101"
    private const val CHALLENGE_SIZE = 32
    private const val PROTOCOL_VERSION = 1
  }
}
