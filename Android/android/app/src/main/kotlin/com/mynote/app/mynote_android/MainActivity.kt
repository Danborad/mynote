package com.mynote.app.mynote_android

import android.content.Intent
import androidx.core.content.FileProvider
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.io.File

class MainActivity: FlutterActivity() {
    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            "mynote/share"
        ).setMethodCallHandler { call, result ->
            when (call.method) {
                "shareNoteImage" -> {
                    val bytes = call.argument<ByteArray>("bytes")
                    val filename = call.argument<String>("filename") ?: "mynote-share.png"
                    if (bytes == null || bytes.isEmpty()) {
                        result.error("EMPTY_IMAGE", "Share image is empty", null)
                        return@setMethodCallHandler
                    }
                    shareImage(bytes, filename)
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun shareImage(bytes: ByteArray, filename: String) {
        val safeName = filename.replace(Regex("[^A-Za-z0-9._-]"), "_")
        val dir = File(cacheDir, "shares").apply { mkdirs() }
        val file = File(dir, safeName)
        file.writeBytes(bytes)

        val uri = FileProvider.getUriForFile(
            this,
            "$packageName.fileprovider",
            file,
        )
        val sendIntent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivity(Intent.createChooser(sendIntent, "分享笔记图片"))
    }
}
