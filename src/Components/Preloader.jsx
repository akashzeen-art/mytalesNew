import React, { useRef, useEffect } from "react";
import "./Preloader.css";

const HERO_VIDEO_URL =
  "https://vz-347babc2-229.b-cdn.net/2389d814-a0d1-4c52-9aad-7e72527b1721/play_480p.mp4";

const Preloader = ({ fadeOut }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const setStartTime = () => {
        video.currentTime = 5;
      };
      video.addEventListener("loadeddata", setStartTime);
      return () => {
        video.removeEventListener("loadeddata", setStartTime);
      };
    }
  }, []);

  return (
    <div className={`preloader ${fadeOut ? "fade-out" : ""}`}>
      {/* Background Video */}
      <video
        ref={videoRef}
        className="preloader-video"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src={HERO_VIDEO_URL} type="video/mp4" />
      </video>

      {/* Overlay Loader */}
      <div className="preloader-overlay">
      </div>
    </div>
  );
};

export default Preloader;
