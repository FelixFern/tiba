package expo.modules.tibalivenotification

import android.app.NotificationManager
import android.content.Context
import android.graphics.Color
import android.view.View
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// Mirrors LiveNotificationState in the TS module.
class LiveState : Record {
  @Field var fromName: String = ""
  @Field var toName: String = ""
  @Field var stopsLeft: Int = 0
  @Field var statusText: String = ""
  @Field var lineColor: String = "#3B82F6"
  @Field var total: Int = 0
  @Field var current: Int = 0
}

class TibaLiveNotificationModule : Module() {
  // Reuses the silent ongoing channel created by the JS notifications layer.
  private val channelId = "tiba-live"
  private val notificationId = 0x71BA
  private val maxDots = 8
  private val dimColor = Color.parseColor("#3A3A3A")

  override fun definition() = ModuleDefinition {
    Name("TibaLiveNotification")

    Function("update") { state: LiveState ->
      val ctx = appContext.reactContext ?: return@Function
      val color = parseColor(state.lineColor)
      val pkg = ctx.packageName

      val views = RemoteViews(pkg, layoutId(ctx, "tiba_live_card"))
      views.setTextViewText(viewId(ctx, "tiba_route"), "${state.fromName}  →  ${state.toName}")
      views.setTextViewText(viewId(ctx, "tiba_status"), "${state.stopsLeft} left · ${state.statusText}")
      views.setInt(viewId(ctx, "tiba_tile"), "setColorFilter", color)

      val shown = minOf(state.total, maxDots)
      for (i in 0 until maxDots) {
        val dotId = viewId(ctx, "tiba_dot_$i")
        if (i < shown) {
          views.setViewVisibility(dotId, View.VISIBLE)
          views.setInt(dotId, "setColorFilter", if (i <= state.current) color else dimColor)
        } else {
          views.setViewVisibility(dotId, View.GONE)
        }
      }

      val notification = NotificationCompat.Builder(ctx, channelId)
        .setSmallIcon(ctx.applicationInfo.icon)
        .setColor(color)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setCustomContentView(views)
        .setCustomBigContentView(views)
        .build()

      notificationManager(ctx).notify(notificationId, notification)
    }

    Function("end") {
      val ctx = appContext.reactContext ?: return@Function
      notificationManager(ctx).cancel(notificationId)
    }
  }

  private fun parseColor(hex: String): Int =
    try { Color.parseColor(hex) } catch (e: Exception) { Color.parseColor("#3B82F6") }

  private fun notificationManager(ctx: Context): NotificationManager =
    ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun layoutId(ctx: Context, name: String): Int =
    ctx.resources.getIdentifier(name, "layout", ctx.packageName)

  private fun viewId(ctx: Context, name: String): Int =
    ctx.resources.getIdentifier(name, "id", ctx.packageName)
}
