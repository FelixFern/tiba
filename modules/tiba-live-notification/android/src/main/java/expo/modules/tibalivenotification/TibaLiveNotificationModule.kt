package expo.modules.tibalivenotification

import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Color
import android.os.Build
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
      val ctx = appContext.reactContext
      if (ctx != null) {
        val color = parseColor(state.lineColor)
        val pkg = ctx.packageName

        // Custom RemoteViews are inflated against the app context, so the
        // platform's "?attr/textColorPrimary" can resolve to dark text even on a
        // dark shade. Pick the text color from the device night mode ourselves so
        // it always contrasts with the notification background.
        val night = isNightMode(ctx)
        val textPrimary = if (night) Color.parseColor("#FAFAFA") else Color.parseColor("#16181B")
        val textSecondary = if (night) Color.parseColor("#B5B5B5") else Color.parseColor("#5A5D63")

        val views = RemoteViews(pkg, layoutId(ctx, "tiba_live_card"))
        views.setTextViewText(viewId(ctx, "tiba_route"), "${state.fromName}  →  ${state.toName}")
        views.setTextViewText(viewId(ctx, "tiba_status"), "${state.stopsLeft} left · ${state.statusText}")
        views.setTextColor(viewId(ctx, "tiba_route"), textPrimary)
        views.setTextColor(viewId(ctx, "tiba_status"), textSecondary)
        // Tile is filled with the line color; keep the "t" glyph white for contrast.
        views.setInt(viewId(ctx, "tiba_tile"), "setColorFilter", color)
        views.setTextColor(viewId(ctx, "tiba_tile_label"), Color.WHITE)

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
          .setSmallIcon(smallIconRes(ctx))
          .setColor(color)
          .setOngoing(true)
          .setOnlyAlertOnce(true)
          .setPriority(NotificationCompat.PRIORITY_LOW)
          // Show the full card on the lock screen (channel must also allow it).
          .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
          // Tapping the card brings the app back to the foreground.
          .setContentIntent(openAppIntent(ctx))
          // The custom card is the whole body — no DecoratedCustomViewStyle chrome
          // so the notification stays compact ("just the card").
          .setCustomContentView(views)
          .setCustomBigContentView(views)
          .build()

        notificationManager(ctx).notify(notificationId, notification)
      }
    }

    Function("end") {
      val ctx = appContext.reactContext
      if (ctx != null) {
        notificationManager(ctx).cancel(notificationId)
      }
    }
  }

  private fun parseColor(hex: String): Int =
    try { Color.parseColor(hex) } catch (e: Exception) { Color.parseColor("#3B82F6") }

  private fun isNightMode(ctx: Context): Boolean =
    (ctx.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) ==
      Configuration.UI_MODE_NIGHT_YES

  // Re-launch the app's main activity when the card is tapped.
  private fun openAppIntent(ctx: Context): PendingIntent {
    val launch = ctx.packageManager.getLaunchIntentForPackage(ctx.packageName)?.apply {
      flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
    }
    var flags = PendingIntent.FLAG_UPDATE_CURRENT
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) flags = flags or PendingIntent.FLAG_IMMUTABLE
    return PendingIntent.getActivity(ctx, 0, launch, flags)
  }

  private fun notificationManager(ctx: Context): NotificationManager =
    ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  // Prefer the white silhouette notification icon generated by the
  // expo-notifications config plugin; fall back to the launcher icon.
  private fun smallIconRes(ctx: Context): Int {
    val id = ctx.resources.getIdentifier("notification_icon", "drawable", ctx.packageName)
    return if (id != 0) id else ctx.applicationInfo.icon
  }

  private fun layoutId(ctx: Context, name: String): Int =
    ctx.resources.getIdentifier(name, "layout", ctx.packageName)

  private fun viewId(ctx: Context, name: String): Int =
    ctx.resources.getIdentifier(name, "id", ctx.packageName)
}
