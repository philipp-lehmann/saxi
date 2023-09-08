import React, { useEffect, useState, useRef } from "react";
import { useCamera } from "react-use-camera";
import imagetracer from "imagetracerjs";

export const WebcamOverlay = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); 

  const { startCamera, stopCamera, capture } = useCamera();
  const [stream, setStream] = useState<MediaStream>();
  const [capturedImage, setCapturedImage] = useState<string | null>(null); 
  const [svgData, setSvgData] = useState<string | null>(null); 

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
  };

  const handleCapture = async () => {
    if (!stream) {
      alert("Camera is not active. Please start the camera first.");
      return;
    }

    try {
      const capturedImageData = await capture(stream, {
        mirror: false // Pass true if you want to mirror the captured image (recommended for front camera)
      });

      if (capturedImageData) {
        const capturedDataURL = capturedImageData.url;
        console.log("URL: " + capturedDataURL);

        // Set the captured image data URL to state
        setCapturedImage(capturedDataURL);

        // Call the function to crop the captured image
        cropImage(capturedDataURL);

        // After cropping, convert the canvas to SVG
        convertCanvasToSVG();
      }
    } catch (error) {
      console.error("Image capture failed:", error);
      alert("Oops! Unable to capture image. Check if the camera stream is active.");
    }
  };

  // Function to crop the image and center it on a square canvas
  const cropImage = (imageDataUrl: string) => {
    console.log("attempt cropping");
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    canvas.width = 480;
    canvas.height = 480;

    image.onload = () => {
      console.log("on load");
      const x = (canvas.width - image.width) / 2;
      const y = (canvas.height - image.height) / 2;

      // Clear the canvas and draw the image centered
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, x, y);

      // Add a bright red square for debugging
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; // Red color with transparency
      ctx.fillRect(0, 0, 100, 100); // Example: Draw a red square at (50, 50) with dimensions 100x100 pixels
    };

    image.onerror = (error) => {
      console.error("Image loading error:", error);
      alert("Oops! Image loading failed. Check if the image URL is correct.");
    };

    // Set the image source after setting up onload and onerror handlers
    image.src = imageDataUrl;
  };

  // Function to convert the canvas content to SVG using imagetracerjs
  const convertCanvasToSVG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const tracedSVG = imagetracer.imageToSVG(imageData, null, null); // Use imagetracerjs to convert

    setSvgData(tracedSVG); // Set the SVG data to state
  };



  return (
    <div className="webcam-container">
      <video
        className="webcam-img"
        ref={videoRef}
        autoPlay
        playsInline
      />
      <button onClick={handleCapture}>Capture</button>

      {/* Display the cropped image */}
      {capturedImage && (
        <div>
          <h2>Captured Image</h2>
          <canvas ref={canvasRef}></canvas>
          {/* <img src={capturedImage} alt="Captured" /> */}
        </div>
      )}

      {/* Display the SVG */}
      {svgData && (
        <div>
          <h2>SVG Output</h2>
          <div dangerouslySetInnerHTML={{ __html: svgData }} />
        </div>
      )}
    </div>
  );
};
