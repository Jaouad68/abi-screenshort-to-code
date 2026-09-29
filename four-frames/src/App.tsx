import { MotionConfig } from "motion/react";
import { Navbar } from "./sections/Navbar";
import { Hero } from "./sections/Hero";
import { Statement } from "./sections/Statement";
import { Booths } from "./sections/Booths";
import { StripWall } from "./sections/StripWall";
import { Included } from "./sections/Included";
import { Prices } from "./sections/Prices";
import { Recently } from "./sections/Recently";
import { Quote } from "./sections/Quote";
import { Enquiry } from "./sections/Enquiry";
import { Footer } from "./sections/Footer";

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Navbar />
      <main>
        <Hero />
        <Statement />
        <Booths />
        <StripWall />
        <Included />
        <Prices />
        <Recently />
        <Quote />
        <Enquiry />
      </main>
      <Footer />
    </MotionConfig>
  );
}
