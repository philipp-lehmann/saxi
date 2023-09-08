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
        const image = new Image();

        // Use await to ensure the image is fully loaded
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = capturedDataURL;

          // Crop and convert the image
          setCapturedImage(capturedDataURL);
          cropImage(capturedDataURL);
        });
      }
    } catch (error) {
      console.error("Image capture failed:", error);
      alert("Oops! Unable to capture image. Check if the camera stream is active.");
    }
  };

  // Function to crop the image and center it on a square canvas
  const cropImage = (imageDataUrl: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();
    canvas.width = 480;
    canvas.height = 480;


    image.onload = () => {
      const cornerSize = 240; // Set the corner size to 50px
      const x = (canvas.width - image.width) / 2;
      const y = (canvas.height - image.height) / 2;

      // Clear the canvas and draw the image centered
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, x, y);

      // Create rounded corners
      ctx.fillStyle = "white"; // Fill the entire canvas with white

      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, cornerSize);
      ctx.arcTo(0, 0, cornerSize, 0, cornerSize);
      ctx.closePath();
      ctx.fill();

      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(canvas.width, 0);
      ctx.lineTo(canvas.width - cornerSize, 0);
      ctx.arcTo(canvas.width, 0, canvas.width, cornerSize, cornerSize);
      ctx.closePath();
      ctx.fill();

      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      ctx.lineTo(0, canvas.height - cornerSize);
      ctx.arcTo(0, canvas.height, cornerSize, canvas.height, cornerSize);
      ctx.closePath();
      ctx.fill();

      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(canvas.width, canvas.height);
      ctx.lineTo(canvas.width - cornerSize, canvas.height);
      ctx.arcTo(canvas.width, canvas.height, canvas.width, canvas.height - cornerSize, cornerSize);
      ctx.closePath();
      ctx.fill();

      // Convert the canvas to grayscale
      ctx.fillStyle = "rgba(0, 0, 0, 1)"; // Black
      ctx.globalCompositeOperation = "saturation";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Apply a posterization effect to the canvas
      const levels = 4; // Adjust the number of levels as needed
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.floor((data[i] / 255) * levels) * (255 / levels);
        data[i + 1] = Math.floor((data[i + 1] / 255) * levels) * (255 / levels);
        data[i + 2] = Math.floor((data[i + 2] / 255) * levels) * (255 / levels);
      }

      ctx.putImageData(imageData, 0, 0);

      // Add a bright red square for debugging
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
      ctx.fillRect(0, 0, 100, 100);

      // Capture image data after drawing and applying filters
      const finalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Convert the canvas to SVG with the captured image data
      convertCanvasToSVG(finalImageData);
    };



    image.onerror = (error) => {
      console.error("Image loading error:", error);
      alert("Oops! Image loading failed. Check if the image URL is correct.");
    };

    // Set the image source after setting up onload and onerror handlers
    image.src = imageDataUrl;
  };

  // Function to convert the canvas content to SVG using imagetracerjs
  const convertCanvasToSVG = (imageData: ImageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const options = { ltres: 0.2, qtres: 1.01, pathomit: 10 }; //
      const tracedSVG = imagetracer.imagedataToSVG(imageData, null, options);
      setSvgData(tracedSVG); // Set the SVG data to state
      console.log(tracedSVG);
    } catch (error) {
      console.error("Error converting to SVG:", error);
    }
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
          <h2>Canvas</h2>
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
