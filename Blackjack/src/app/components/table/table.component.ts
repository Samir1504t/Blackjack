import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

@Component({
  selector: 'app-table',
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss'],
  standalone: false
})
export class TableComponent implements OnInit, AfterViewInit {
  @ViewChild('rendererContainer') rendererContainer!: ElementRef;
  
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private controls!: OrbitControls;

  constructor() { }

  ngAfterViewInit() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    
    this.initScene();
    this.loadTable();
    this.animate();
  }

  ngOnInit() {
    // ngOnInit bleibt leer, da wir DOM-Elemente erst in ngAfterViewInit haben
  }

  private initScene(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);
    
    // Bessere Kamera-Position für Blackjack-Tisch
    this.camera.position.set(0, 10, 7); // X, Y (Höhe), Z (Entfernung)
    this.camera.lookAt(0, 0, 0);        // Kamera auf Mittelpunkt ausrichten
    
    // Orbit Controls hinzufügen
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true; // Für smoothere Animation
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 5;      // Minimale Zoom-Distanz
    this.controls.maxDistance = 15;     // Maximale Zoom-Distanz
    this.controls.maxPolarAngle = Math.PI / 2.1; // Begrenzt die vertikale Rotation
    
    // Bessere Beleuchtung
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);
  }

  private loadTable(): void {
    const loader = new OBJLoader();
    loader.load(
      'assets/models/Blackjack-Table.obj',
      (object) => {
        this.scene.add(object);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total * 100) + '% geladen');
      },
      (error) => {
        console.error('Ein Fehler ist aufgetreten:', error);
      }
    );
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());
    this.controls.update(); // Updates für smooth damping
    this.renderer.render(this.scene, this.camera);
  }
}
