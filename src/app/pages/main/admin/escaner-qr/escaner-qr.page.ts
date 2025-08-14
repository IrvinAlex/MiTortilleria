
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import {
  Barcode,
  BarcodeFormat,
  BarcodeScanner,
  LensFacing,
  StartScanOptions,
} from '@capacitor-mlkit/barcode-scanning';
import { LoadingController, ModalController, Platform, ToastController,  AlertController  } from '@ionic/angular';
import html2canvas from 'html2canvas';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { BarcodeScanningModalComponent } from './barcode-scanning-modal.component';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Clipboard } from '@capacitor/clipboard';
import { Browser } from '@capacitor/browser';
import { Camera } from '@capacitor/camera';
import { where } from 'firebase/firestore';
import { UtilsService } from 'src/app/services/utils.service';
import { FirebaseService } from 'src/app/services/firebase.service';
import { User } from 'src/app/models/user.model';
import { Pedido } from 'src/app/models/pedido.model';
import { AsignarEntregaComponent } from 'src/app/shared/components/asignar-entrega/asignar-entrega.component';
@Component({
  selector: 'app-escaner-qr',
  templateUrl: './escaner-qr.page.html',
  styleUrls: ['./escaner-qr.page.scss'],
})
export class EscanerQrPage implements OnInit {

  // Propiedades iniciales
  segment = 'scan'; // Controla el segmento activo ('scan' o 'generate')
  qrText = ''; // Texto para generar el código QR
  scanResult = ''; // Resultado del escaneo del código QR
  resultado: any[] = []; // Resultados obtenidos de procesos internos
  loading: boolean = false; // Indicador de carga
  pedidos: any[] = []; // Lista de pedidos obtenidos de Firebase
  
  // Servicios inyectados
  utilsSvc = inject(UtilsService); // Servicio de utilidades
  firebaseSvc = inject(FirebaseService); // Servicio para interacción con Firebase

  constructor(
    private loadingController: LoadingController, // Controlador para mostrar indicadores de carga
    private platform: Platform, // Detecta la plataforma (Capacitor, web, etc.)
    private modalController: ModalController, // Controlador para mostrar modales
    private toastController: ToastController, // Controlador para mostrar notificaciones tipo toast
    private alertController: AlertController // Controlador para mostrar alertas
  ) {}

  async ngOnInit() {
    // Verifica permisos para usar la cámara y el escáner de códigos QR

    const status = await Camera.checkPermissions(); // Verifica permisos de cámara
    if (status.camera !== 'granted') {
      const permission = await Camera.requestPermissions(); // Solicita permisos de cámara
      if (permission.camera !== 'granted') {
        return;
      }
    } 
  }

  // =============== Escaneo de QR ================
  async startScan() {
    // Muestra un modal para realizar el escaneo del código QR
    const modal = await this.modalController.create({
      cssClass: 'barcode-scanning-modal',
      showBackdrop: false,
      component: BarcodeScanningModalComponent,
      componentProps: {
        formats: [], // Formatos de códigos admitidos
        lensFacing: LensFacing.Back, // Usa la cámara trasera
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss(); // Obtiene los datos al cerrar el modal

    if (data) {
      let resultado2 = data?.barcode?.displayValue;

      try {
        // Limpia y analiza el resultado del escaneo para convertirlo en JSON
        const sanitizedResult = resultado2
          .replace(/'/g, '"') // Cambia comillas simples por dobles
          .replace(/([a-zA-Z0-9_]+):/g, '"$1":'); // Añade comillas a las claves

        const objetoResultado = JSON.parse(sanitizedResult);
        const uidPedido = objetoResultado.uid_pedido; // Extrae el UID del pedido
        this.getPedido(uidPedido); // Obtiene los detalles del pedido
      } catch (error) {
      }
    }
  }

  // ========== Obtener Pedidos y Detalles de Pedido ===========
  async getPedido(uid_pedido) {
    let path = `pedidos/${uid_pedido}`; // Ruta en Firebase para obtener el pedido
    
    const loading = await this.utilsSvc.loading();
    await loading.present();

    // Obtiene los datos del pedido
    this.firebaseSvc.getDocument(path).then((pedido: any) => {
      this.pedidos = pedido;
      let path2 = `users/${pedido.uid_cliente}`; // Ruta para obtener datos del cliente
      pedido.id = uid_pedido;

      return this.firebaseSvc.getDocument(path2).then((user: User) => {
        // Agrega el nombre del cliente al pedido
        pedido.nombre_cliente = `${user.name} ${user.mother_Last_Name} ${user.father_Last_Name}`;

        const path3 = `pedidos/${uid_pedido}/detalle_pedido`; // Ruta para obtener detalles del pedido

        // Obtiene detalles del pedido y productos relacionados
        this.firebaseSvc.getCollectionData(path3, []).subscribe({
          next: (data) => {
            pedido.detalle_pedido = data;
            pedido.detalle_pedido.forEach(async (detalle: any) => {
              const detallePath = `productos/${detalle.uid_producto}`;
              try {
                let producto = await this.firebaseSvc.getDocument(detallePath);
                detalle.producto = producto; // Asocia los datos del producto al detalle
              } catch (err) {
              }
            });
          },
        });

        this.openAsignarEntrega(pedido); // Abre el modal para asignar entrega
      });
    }).catch(error => {
      // Maneja errores al obtener el pedido
      
    }).finally(() => {
      loading.dismiss(); // Oculta el indicador de carga
    });
  }

  // =========== Modal para Asignar Entrega ===========
  async openAsignarEntrega(pedido: any) {
    let success = await this.utilsSvc.presentModal({
      component: AsignarEntregaComponent,
      componentProps: { pedido },
    });

    if (success) {
      this.utilsSvc.presentToast({
        message: `Pedido entregado`,
        duration: 2500,
        color: 'primary',
        position: 'bottom',
        icon: 'checkmark-circle-outline',
      });
    }
  }

  // =============== Leer QR desde una imagen ================
  async readBarcodeFromImage() {
    const { files } = await FilePicker.pickImages({limit: 1}); // Selecciona imágenes
    const path = files[0]?.path;

    if (!path) return;

    const { barcodes } = await BarcodeScanner.readBarcodesFromImage({
      path,
      formats: [],
    });
    this.scanResult = barcodes[0].displayValue; // Guarda el resultado del escaneo
    if (barcodes.length > 0) {
      let resultado2 = barcodes[0].displayValue;

      try {
        // Limpia y analiza el resultado del escaneo para convertirlo en JSON
        const sanitizedResult = resultado2
          .replace(/'/g, '"') // Cambia comillas simples por dobles
          .replace(/([a-zA-Z0-9_]+):/g, '"$1":'); // Añade comillas a las claves

        const objetoResultado = JSON.parse(sanitizedResult);
        const uidPedido = objetoResultado.uid_pedido; // Extrae el UID del pedido
        this.getPedido(uidPedido); // Obtiene los detalles del pedido
      } catch (error) {
      }
    }
  }

  // =============== Función para capturar y compartir la pantalla ================
  captureScreen() {
    const element = document.getElementById('qrImage') as HTMLElement;

    html2canvas(element).then((canvas: HTMLCanvasElement) => {
      if (this.platform.is('capacitor')) this.shareImage(canvas);
      else this.dowloadImage(canvas);
    });
  }

  // Descarga una imagen generada
  dowloadImage(canvas: HTMLCanvasElement) {
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = 'qr.png';
    link.click();
  }

  // Comparte una imagen generada
  async shareImage(canvas: HTMLCanvasElement) {
    const loading = await this.loadingController.create({ spinner: 'crescent' });
    await loading.present();

    const base64 = canvas.toDataURL();
    const path = 'qr.png';

    await Filesystem.writeFile({ path, data: base64, directory: Directory.Cache }).then(async (res) => {
      let uri = res.uri;
      await Share.share({ url: uri });
      await Filesystem.deleteFile({ path, directory: Directory.Cache });
    }).finally(() => {
      loading.dismiss();
    });
  }

  // Copia el resultado del escaneo al portapapeles
  async writeToClipboard() {
    await Clipboard.write({ string: this.scanResult });

    const toast = await this.toastController.create({
      message: 'Copiado al portapapeles',
      duration: 1000,
      color: 'tertiary',
      icon: 'clipboard-outline',
      position: 'middle',
    });
    toast.present();
  }

  // Abre una URL en el navegador
  async openCapacitorSite() {
    const alert = await this.alertController.create({
      header: 'Confirm!',
      message: 'Quieres abrir este enlace en el navegador?',
      buttons: [
        { text: 'Cancel', role: 'cancel', cssClass: 'secondary' },
        { text: 'Okay', handler: () => console.log('Confirm Okay') },
      ],
    });
    await alert.present();

    let url = this.scanResult;
    if (!url.startsWith('https://')) url = 'https://' + url;
    await Browser.open({ url });
  }

  // Valida si el resultado es una URL
  isUrl() {
    let regex = /\.(com|net|io|me|crypto|ai)\b/i;
    return regex.test(this.scanResult);
  }
}

