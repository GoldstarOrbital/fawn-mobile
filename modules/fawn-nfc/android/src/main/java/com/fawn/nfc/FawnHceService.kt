package com.fawn.nfc

import android.content.Context
import android.nfc.cardemulation.HostApduService
import android.os.Bundle
import java.nio.ByteBuffer
import java.security.KeyStore
import java.security.Signature
import java.util.UUID

class FawnHceService : HostApduService() {
  override fun processCommandApdu(commandApdu: ByteArray?, extras: Bundle?): ByteArray {
    if (commandApdu == null || commandApdu.size < 5) return STATUS_WRONG_DATA
    if (isSelectAid(commandApdu)) return STATUS_OK
    if (!isChallengeCommand(commandApdu)) return STATUS_INS_NOT_SUPPORTED

    val length = commandApdu[4].toInt() and 0xff
    if (length != CHALLENGE_SIZE || commandApdu.size < 5 + length) return STATUS_WRONG_DATA
    val challenge = commandApdu.copyOfRange(5, 5 + length)
    val deviceId = getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(DEVICE_ID, null)
      ?: return STATUS_CONDITIONS_NOT_SATISFIED

    return try {
      val uuid = UUID.fromString(deviceId)
      val keyStore = KeyStore.getInstance(KEYSTORE).apply { load(null) }
      val privateKey = keyStore.getKey(KEY_ALIAS, null) as? java.security.PrivateKey
        ?: return STATUS_CONDITIONS_NOT_SATISFIED
      val signature = Signature.getInstance("SHA256withECDSA").apply {
        initSign(privateKey)
        update(SIGNING_PREFIX)
        update(challenge)
      }.sign()
      if (signature.size !in 64..80) return STATUS_WRONG_DATA
      ByteBuffer.allocate(1 + 16 + 2 + signature.size + STATUS_OK.size).apply {
        put(PROTOCOL_VERSION.toByte())
        putLong(uuid.mostSignificantBits)
        putLong(uuid.leastSignificantBits)
        putShort(signature.size.toShort())
        put(signature)
        put(STATUS_OK)
      }.array()
    } catch (_: Exception) {
      STATUS_CONDITIONS_NOT_SATISFIED
    }
  }

  override fun onDeactivated(reason: Int) = Unit

  private fun isSelectAid(command: ByteArray): Boolean {
    if (command.size < 6 || command[0] != 0x00.toByte() || command[1] != 0xA4.toByte() || command[2] != 0x04.toByte()) return false
    val length = command[4].toInt() and 0xff
    if (command.size < 5 + length) return false
    return command.copyOfRange(5, 5 + length).contentEquals(HCE_AID)
  }

  private fun isChallengeCommand(command: ByteArray): Boolean =
    command[0] == 0x80.toByte() && command[1] == 0x10.toByte()

  companion object {
    private const val KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "fawn_hce_signing_v1"
    private const val PREFS = "fawn_hce"
    private const val DEVICE_ID = "device_id"
    private const val CHALLENGE_SIZE = 32
    private const val PROTOCOL_VERSION = 1
    private val SIGNING_PREFIX = "FAWN-NFC-v1\u0000".toByteArray(Charsets.UTF_8)
    private val HCE_AID = "F04641574E0101".chunked(2).map { it.toInt(16).toByte() }.toByteArray()
    private val STATUS_OK = byteArrayOf(0x90.toByte(), 0x00)
    private val STATUS_WRONG_DATA = byteArrayOf(0x6A, 0x80.toByte())
    private val STATUS_CONDITIONS_NOT_SATISFIED = byteArrayOf(0x69, 0x85.toByte())
    private val STATUS_INS_NOT_SUPPORTED = byteArrayOf(0x6D, 0x00)
  }
}
