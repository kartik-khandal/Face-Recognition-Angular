import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit } from '@angular/core';
import * as faceapi from 'face-api.js';

@Component({
  selector: 'app-face-recognition',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './face-recognition.component.html',
  styleUrls: ['./face-recognition.component.scss']
})
export class FaceRecognitionComponent implements OnInit, AfterViewInit {
  video!: HTMLVideoElement;
  isLoading: boolean = true; // Add a flag to track loading state
  
  // Calibration values
  readonly referenceBoxWidth = 150; // Measured face bounding box width at reference distance
  readonly referenceDistance = 100; // Known distance (cm) for reference width
  readonly distanceAdjustmentFactor = 0.85; // Adjusted factor to improve accuracy

  constructor() {}

  ngOnInit(): void {}

  async ngAfterViewInit(): Promise<void> {
    this.video = document.getElementById('videoInput') as HTMLVideoElement;

    // Set the loading flag to true before starting model loading
    await Promise.all([
      faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
      faceapi.nets.ssdMobilenetv1.loadFromUri('/models')
    ]);

    // Set the loading flag to false once models are loaded
    
    this.startVideo();
  }

  startVideo(): void {
    navigator.mediaDevices.getUserMedia({ video: {} })
      .then(stream => this.video.srcObject = stream)
      .catch(err => console.error('Error accessing webcam:', err));

    this.video.addEventListener('play', () => {
      this.recognizeFaces();
    });
  }

  async recognizeFaces(): Promise<void> {
    const labeledDescriptors = await this.loadLabeledImages();
    this.isLoading = false;
    const faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.55);
    
    const canvas = faceapi.createCanvasFromMedia(this.video);
    document.getElementById('main-sec')?.appendChild(canvas);
    canvas.width = this.video.width;
    canvas.height = this.video.height;
    
    const displaySize = { width: this.video.width, height: this.video.height };
    faceapi.matchDimensions(canvas, displaySize);
    
    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(this.video)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      const ctx = canvas.getContext('2d');
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
  
      // Match each detected face
      resizedDetections.forEach(detection => {
        const box = detection.detection.box;
        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
        console.log(bestMatch)
        // Estimate the distance based on the width of the bounding box
        let distance = this.estimateDistance(box.width);
        distance *= this.distanceAdjustmentFactor; // Apply adjustment factor
        
        // Display name and distance together
        const label = `${bestMatch.label} - ${distance.toFixed(2)} cm`;
        const drawBox = new faceapi.draw.DrawBox(box, { label });
        drawBox.draw(canvas);
      });
    }, 100);
  }

  estimateDistance(boxWidth: number): number {
    // Proportional distance calculation based on reference values
    return (this.referenceBoxWidth / boxWidth) * this.referenceDistance;
  }

  loadLabeledImages(): Promise<faceapi.LabeledFaceDescriptors[]> {
    const labels = ['Black Widow', 'Captain America', 'Hawkeye', 'Jim Rhodes', 'Tony Stark', 'Thor', 'Captain Marvel', 'Kartik Khandal', 'Puja Kale', 'Praveen', 'Nikheel', 'Vivekanand', 'Roshni'];

    return Promise.all(
      labels.map(async (label) => {
        const descriptions = [];
        for (let i = 1; i <= 2; i++) {
          const img = await faceapi.fetchImage(`/labeled_images/${label}/${i}.jpg`);
          const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
          if (detections) descriptions.push(detections.descriptor);
        }
        console.log(descriptions);
        return new faceapi.LabeledFaceDescriptors(label, descriptions);
      })
    );
  }
}
