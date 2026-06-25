export interface LiveNotificationState {
  fromName: string;
  toName: string;
  stopsLeft: number;
  statusText: string;
  /** Line color as a hex string, e.g. "#E53935". */
  lineColor: string;
  /** Stops in the current leg (for the dot strip). */
  total: number;
  /** Stops travelled in the current leg (dots up to this index are filled). */
  current: number;
}
