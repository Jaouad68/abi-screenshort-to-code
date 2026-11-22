import React from "react";
import { Composition } from "remotion";
import { MethodeVideo, FPS, TOTAL } from "./Video";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="MethodeVideo"
    component={MethodeVideo}
    durationInFrames={TOTAL}
    fps={FPS}
    width={1080}
    height={1920}
  />
);
