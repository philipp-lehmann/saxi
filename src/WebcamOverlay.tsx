import React from "react";
import { useEffect, useState, useRef } from "react";
import { useCamera } from "react-use-camera";

export const WebcamOverlay = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const { startCamera, stopCamera, capture } = useCamera();
  const [stream, setStream] = useState<MediaStream>();

  useEffect(() => {
    const initializeCamera = async () => {
      try {
        const cameraStream = await startCamera({ /* MediaTrackConstraints */ });
        setStream(cameraStream);
        videoRef.current!.srcObject = cameraStream;
      } catch (error) {
        console.error("Camera initialization failed:", error);
      }
    };

    initializeCamera();

    // Cleanup function to stop the camera when the component unmounts
    return () => {
      if (stream) {
        stopCamera(stream);
      }
    };
  }, [startCamera, stopCamera]);


  const handleStartCamera = async () => {
    try {
      const stream = await startCamera({ /* MediaTrackConstraints */ });
      setStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      alert(`Oops! Camera failed to start: ${error.message}`);
      console.error(error);
    }
  }

  const handleCapture = async () => {
    if (!stream) {
      alert("Camera is not active. Please start the camera first.");
      return;
    }

    try {
      const capturedImage = await capture(stream, {
        mirror: false // Pass true if you want to mirror the captured image (recommended for front camera)
      });
      if (capturedImage) {
        console.log("URL:" + capturedImage.url);
        console.log("Blob: " + capturedImage.blob);
      }
    } catch (error) {
      console.error("Image capture failed:", error);
      alert("Oops! Unable to capture image. Check if the camera stream is active.");
    }
  }

  return (
    <div>
      <video
        ref={videoRef}
        autoPlay
        playsInline
      />
      <button onClick={handleCapture}>Capture</button>
    </div>
  );
}
