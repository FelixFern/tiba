import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';
import { HStack, VStack, ZStack, Text, Spacer } from '@expo/ui/swift-ui';
import { Circle, RoundedRectangle } from '@expo/ui/swift-ui';
import { frame, foregroundStyle, padding, font } from '@expo/ui/swift-ui/modifiers';

// ============================================================================
// iOS Live Activity — lock-screen card + Dynamic Island (design screen 04)
// ============================================================================
//
// The layout is authored in TS with @expo/ui SwiftUI components; expo-widgets
// renders it natively and generates the widget extension at prebuild time.
// Driven from JS via `TibaTripActivity.start/update/end` (see lib/live-card.ts).

const MAX_DOTS = 8;

export interface TibaActivityProps {
  fromName: string; // current/nearest station
  toName: string; // current leg alight (transfer point or destination)
  stopsLeft: number;
  statusText: string; // "alarm armed" | "transfer ahead" | "arriving"
  lineColor: string; // hex of the line being ridden
  total: number; // stops in the current leg (for the dot strip)
  current: number; // stops travelled in the current leg
}

function TibaTripActivityLayout(props: TibaActivityProps, environment: LiveActivityEnvironment) {
  'widget';

  const fg = environment.colorScheme === 'dark' ? '#FAFAFA' : '#0A0A0A';
  const sub = '#8A8A8A';
  const dim = '#3A3A3A';
  const stops = `${props.stopsLeft} ${props.stopsLeft === 1 ? 'station' : 'stations'} left`;
  const dotCount = Math.max(0, Math.min(props.total, MAX_DOTS));
  const dots = Array.from({ length: dotCount }, (_, i) => i);

  const tile = (
    <ZStack modifiers={[frame({ width: 26, height: 26 })]}>
      <RoundedRectangle
        cornerRadius={6}
        modifiers={[foregroundStyle(props.lineColor), frame({ width: 26, height: 26 })]}
      />
      <Text modifiers={[foregroundStyle('#0A0A0A'), font({ size: 15, weight: 'bold' })]}>t</Text>
    </ZStack>
  );

  const dotStrip = (
    <HStack spacing={5}>
      {dots.map((i) => (
        <Circle
          key={i}
          modifiers={[
            frame({ width: 7, height: 7 }),
            foregroundStyle(i <= props.current ? props.lineColor : dim),
          ]}
        />
      ))}
    </HStack>
  );

  return {
    banner: (
      <HStack spacing={12} modifiers={[padding({ all: 14 })]}>
        {tile}
        <VStack alignment="leading" spacing={4}>
          <Text modifiers={[foregroundStyle(fg), font({ size: 16, weight: 'bold' })]}>
            {`${props.fromName} → ${props.toName}`}
          </Text>
          <Text modifiers={[foregroundStyle(sub), font({ size: 12 })]}>
            {`${stops} · ${props.statusText}`}
          </Text>
          {dotStrip}
        </VStack>
        <Spacer />
      </HStack>
    ),
    compactLeading: (
      <Circle modifiers={[frame({ width: 10, height: 10 }), foregroundStyle(props.lineColor)]} />
    ),
    compactTrailing: (
      <Text modifiers={[foregroundStyle(fg), font({ size: 13, weight: 'semibold' })]}>
        {String(props.stopsLeft)}
      </Text>
    ),
    minimal: (
      <Text modifiers={[foregroundStyle(props.lineColor), font({ size: 12, weight: 'bold' })]}>
        {String(props.stopsLeft)}
      </Text>
    ),
    expandedLeading: (
      <Text modifiers={[foregroundStyle(fg), font({ size: 14, weight: 'semibold' })]}>
        {props.fromName}
      </Text>
    ),
    expandedTrailing: (
      <Text modifiers={[foregroundStyle(fg), font({ size: 14, weight: 'semibold' })]}>
        {props.toName}
      </Text>
    ),
    expandedBottom: (
      <Text modifiers={[foregroundStyle(sub), font({ size: 12 })]}>
        {`${stops} · ${props.statusText}`}
      </Text>
    ),
  };
}

export const TibaTripActivity = createLiveActivity<TibaActivityProps>(
  'TibaTripActivity',
  TibaTripActivityLayout
);
