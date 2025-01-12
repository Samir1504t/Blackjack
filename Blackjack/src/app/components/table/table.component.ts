import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TextureLoader } from 'three';

class Card {
  constructor(
    public suit: 'hearts' | 'diamonds' | 'clubs' | 'spades',
    public value: string,
    public numericValue: number
  ) {}

  get textureId(): string {
    return `${this.suit}_${this.value}`;
  }
}

class Hand {
  cards: Card[] = [];

  addCard(card: Card) {
    this.cards.push(card);
  }

  getScore(): number {
    let score = 0;
    let aces = 0;

    for (const card of this.cards) {
      if (card.value === 'ace') {
        aces++;
      }
      score += card.numericValue;
    }

    while (score > 21 && aces > 0) {
      score -= 10;
      aces--;
    }

    return score;
  }

  clear() {
    this.cards = [];
  }
}

class Deck {
  private cards: Card[] = [];

  constructor() {
    this.initializeDeck();
  }

  private initializeDeck() {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const values = [
      { name: 'ace', value: 11 },
      { name: '2', value: 2 },
      { name: '3', value: 3 },
      { name: '4', value: 4 },
      { name: '5', value: 5 },
      { name: '6', value: 6 },
      { name: '7', value: 7 },
      { name: '8', value: 8 },
      { name: '9', value: 9 },
      { name: '10', value: 10 },
      { name: 'jack', value: 10 },
      { name: 'queen', value: 10 },
      { name: 'king', value: 10 }
    ];

    for (const suit of suits) {
      for (const value of values) {
        this.cards.push(new Card(suit as any, value.name, value.value));
      }
    }
  }

  shuffle(): void {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  drawCard(): Card | undefined {
    return this.cards.pop();
  }
}

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
  private cardGeometry!: THREE.PlaneGeometry;
  private cardMaterials: Map<string, THREE.Material> = new Map();
  private cards: THREE.Object3D[] = [];
  private cardModel: THREE.Group | null = null;
  private isModelLoaded = false;

  public gameInProgress = false;
  private deck!: Deck;
  private playerHand!: Hand;
  private dealerHand!: Hand;
  public showDealerScore = false;

  constructor() {
    this.initializeGame();
  }

  private initializeGame() {
    this.deck = new Deck();
    this.playerHand = new Hand();
    this.dealerHand = new Hand();
  }

  async ngAfterViewInit() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();

    try {
      await this.loadCardModel();
      this.initScene();
      this.loadTable();
      this.animate();
    } catch (error) {
      console.error('Fehler', error);
    }

    window.addEventListener('resize', () => {
      const width = this.rendererContainer.nativeElement.clientWidth;
      const height = this.rendererContainer.nativeElement.clientHeight;

      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    });
  }

  ngOnInit() {}

  private initScene(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.rendererContainer.nativeElement.appendChild(this.renderer.domElement);

    this.camera.position.set(0, 5, 0); // Kamera direkt über dem Tisch
    this.camera.lookAt(0, 0, 0);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.minDistance = 1;
    this.controls.maxDistance = 15;
    this.controls.maxPolarAngle = Math.PI / 1.5;

    this.renderer.shadowMap.enabled = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(0, 5, 0);
    directionalLight.castShadow = true;
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);

    this.cardGeometry = new THREE.PlaneGeometry(1, 1.4);

    const textureLoader = new TextureLoader();
    textureLoader.load(
      'assets/models/back.png',
      (texture) => {
        this.cardMaterials.set('back', new THREE.MeshStandardMaterial({
          map: texture,
          normalMap: texture,
          side: THREE.DoubleSide
        }));
      },
      undefined,
      (error) => {
        console.error('Fehler beim Laden der Back-Textur', error);
      }
    );
  }

  private loadTable(): void {
    const loader = new GLTFLoader();
    loader.load(
      'assets/models/blackjack.glb',
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        this.scene.add(gltf.scene);
      },
    );
  }

  private animate(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  private loadCardModel(): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new OBJLoader();
      loader.load(
        'assets/models/card.obj',
        (object) => {
          this.cardModel = object;
          this.isModelLoaded = true;
          resolve();
        },
      );
    });
  }

  private addCard(x: number, y: number, z: number, isFaceUp: boolean = false, cardValue?: string): void {
    if (!this.cardModel) {
      console.error('Kartenmodell noch nicht geladen');
      return;
    }

    let material: THREE.Material;
    if (isFaceUp && cardValue) {
      if (!this.cardMaterials.has(cardValue)) {
        const textureLoader = new TextureLoader();
        const texturePath = `assets/models/${cardValue}.png`;

        const texture = textureLoader.load(
          texturePath,
          (loadedTexture) => {},
          undefined,
          (error) => {
            console.error('Fehler beim Laden der Textur', cardValue, error);
          }
        );

        this.cardMaterials.set(cardValue, new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide
        }));
      }
      material = this.cardMaterials.get(cardValue)!;
    } else {
      material = this.cardMaterials.get('back')!;
    }

    const cardMesh = this.cardModel.clone();
    cardMesh.scale.set(0.5, 0.5, 0.5);

    cardMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = material;
      }
    });

    cardMesh.position.set(x, y - 0.2, z);

    if (isFaceUp) {
      cardMesh.rotation.x = Math.PI;
      cardMesh.rotation.z = Math.PI;
    }

    this.cards.push(cardMesh);
    this.scene.add(cardMesh);
  }

  private async updateTableView(showAllDealerCards: boolean = false): Promise<void> {
    this.clearTable();

    const dealerCards = this.dealerHand.cards;
    const dealerOffset = -1.5;
    const cardSpacing = 0.9;
    for (let i = 0; i < dealerCards.length; i++) {
      const card = dealerCards[i];
      this.addCard(dealerOffset + i * cardSpacing, -3.2, -2, showAllDealerCards || i === 0,
        (showAllDealerCards || i === 0) ? card.textureId : undefined);
    }

    const playerOffset = -1.5;
    const playerCards = this.playerHand.cards;
    for (let i = 0; i < playerCards.length; i++) {
      const card = playerCards[i];
      this.addCard(playerOffset + i * cardSpacing, -3.2, 0.5, true, card.textureId);
    }
  }

  public async startNewGame(): Promise<void> {
    if (this.gameInProgress) return;

    this.showDealerScore = false;
    this.gameInProgress = true;

    this.playerHand = new Hand();
    this.dealerHand = new Hand();

    this.clearTable();
    this.deck = new Deck();
    this.deck.shuffle();

    this.dealerHand.addCard(this.deck.drawCard()!);
    await this.updateTableView();
    await new Promise(resolve => setTimeout(resolve, 500));

    this.playerHand.addCard(this.deck.drawCard()!);
    await this.updateTableView();
    await new Promise(resolve => setTimeout(resolve, 500));

    this.dealerHand.addCard(this.deck.drawCard()!);
    await this.updateTableView();
    await new Promise(resolve => setTimeout(resolve, 500));

    this.playerHand.addCard(this.deck.drawCard()!);
    await this.updateTableView();
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  public async hit(): Promise<void> {
    if (!this.gameInProgress) return;

    const card = this.deck.drawCard();
    if (card) {
      this.playerHand.addCard(card);
      await this.updateTableView();

      await new Promise(resolve => setTimeout(resolve, 500));

      if (this.playerHand.getScore() > 21) {
        await this.endGame('Dealer gewinnt ');
      }
    }
  }

  public async stand(): Promise<void> {
    if (!this.gameInProgress) return;

    this.showDealerScore = true;

    await this.updateTableView(true);
    await new Promise(resolve => setTimeout(resolve, 500));

    while (this.dealerHand.getScore() < 17) {
      const card = this.deck.drawCard();
      if (card) {
        this.dealerHand.addCard(card);
        await this.updateTableView(true);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    await this.determineWinner();
  }

  private clearTable(): void {
    for (const card of this.cards) {
      this.scene.remove(card);
    }
    this.cards = [];
  }

  private async endGame(message: string): Promise<void> {
    alert(message);
    this.gameInProgress = false;
  }

  private async determineWinner(): Promise<void> {
    const playerScore = this.playerHand.getScore();
    const dealerScore = this.dealerHand.getScore();

    if (dealerScore > 21) {
      await this.endGame('Spieler gewinnt. Dealer hat sich überkauft');
    } else if (playerScore > dealerScore) {
      await this.endGame('Spieler gewinnt');
    } else if (dealerScore > playerScore) {
      await this.endGame('Dealer gewinnt');
    } else {
      await this.endGame('Unentschieden');
    }
  }

  public getPlayerScore(): number {
    return this.playerHand?.getScore() || 0;
  }

  public getDealerScore(): number {
    if (!this.showDealerScore) {
      return this.dealerHand?.cards[0]?.numericValue || 0;
    }
    return this.dealerHand?.getScore() || 0;
  }
}
