import { Routes } from '@angular/router';
import { HomeComponent } from './layout/home/home.component';
import { FaceRecognitionComponent } from './layout/face-recognition/face-recognition.component';

export const routes: Routes = [
    { path:'', component: FaceRecognitionComponent }
];
