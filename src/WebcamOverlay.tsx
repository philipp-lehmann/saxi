import React, { useEffect, useState, useRef } from "react";
import { useCamera } from "react-use-camera";
import Image from 'image-js';
import cannyEdgeDetector from 'canny-edge-detector';
import imagetracer from "imagetracerjs";

interface WebcamOverlayProps {
  onNewSVGReady: (svgData: string) => void;
}

export const WebcamOverlay = ({ onNewSVGReady }: WebcamOverlayProps) => {
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
          setTimeout(() => {
            edgeDetectImage();
          }, 1000);
          
        });
      }
    } catch (error) {
      console.error("Image capture failed:", error);
      setTimeout(() => {
        const captureButton = document.getElementById("capture-button");
        if (captureButton) {
          console.log("retry")
          captureButton.click();
        }
      }, 100);
    }
  };

  const edgeDetectImage = () => {
    console.log('start edge detection')
    Image.load(capturedImage).then((img: typeof Image) => {
      console.log('then', img.width);
      const grey = img.grey().resize({ width: 480 });


      const params = {
        gaussianBlur: 4.0, // Default 1.1
        lowThreshold: 20, // Default 10
        highThreshold: 40 // Default 30
      };
      const edge = cannyEdgeDetector(grey, params);
      console.log(edge);
      convertCanvasToSVG(edge);
    })
  };


  // Function to convert the canvas content to SVG using imagetracerjs
  const convertCanvasToSVG = (imageData: ImageData) => {
    try {
      const options = { 
        ltres: 0.0, 
        qtres: 1, 
        pathomit: 3, 
        scale: 5, 
        numberofcolors: 1,
      }; 
      const tracedSVG = imagetracer.imagedataToSVG(imageData, null, options);
      setSvgData(tracedSVG);
      console.log(tracedSVG);
      onNewSVGReady(tracedSVG);
    } catch (error) {
      console.error("Error converting to SVG:", error);
    }
  };


  return (
    <div className="webcam-container">
      <video
        className="output"
        ref={videoRef}
        autoPlay
        playsInline
      />
      <button id="capture-button" onClick={handleCapture}>Capture</button>

      {/* Display the cropped image */}
      {capturedImage && (
        <div className="output">
          <h2>Canvas</h2>
          <img src={capturedImage} alt="Captured" />
        </div>
      )}

      {/* Display the SVG */}
      {svgData && (
        <div className="output">
          <h2>SVG Output</h2>
          <div className="output" dangerouslySetInnerHTML={{ __html: svgData }} />
        </div>
      )}
    </div>
  );
};
