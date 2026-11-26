import React from "react";
import { Composition } from "remotion";
import { Film, FPS, TOTAL, W, H } from "./Film";

export const RemotionRoot: React.FC = () => (
  <Composition id="Chateaudun" component={Film} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
);
