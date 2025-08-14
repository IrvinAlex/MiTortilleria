import { inject, Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { User } from '../models/user.model';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { getFirestore, setDoc, doc, getDoc, addDoc, collection, collectionData, query, updateDoc,deleteDoc, DocumentReference } from '@angular/fire/firestore';
import { UtilsService } from './utils.service';
import { getStorage, uploadString, ref, getDownloadURL, deleteObject } from "firebase/storage";

import firebase from 'firebase/compat/app';
import { where } from 'firebase/firestore'; 
import { map, Observable, forkJoin  } from 'rxjs';
import { Timestamp } from 'firebase/firestore';
import { catchError, of, switchMap } from 'rxjs';
import { NotificationsPushService } from './notifications-push.service';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { FacebookLogin } from '@capacitor-community/facebook-login';
import { isPlatform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  auth = inject(AngularFireAuth);
  firestore = inject(AngularFirestore);
  storage = inject(AngularFirestore);
  utilsSvc = inject(UtilsService);
  notificacionesSvc = inject(NotificationsPushService);

  // =================== Autenticacion ==================
  getAuth() {
    return getAuth();
  }
  // =============== Acceder ==========================
  signIn(user: User) {
    return signInWithEmailAndPassword(getAuth(), user.email, user.password);
  }

  async loginWithGoogle() {
    if (isPlatform('capacitor')) {
      const googleUser = await GoogleAuth.signIn();
      const credential = firebase.auth.GoogleAuthProvider.credential(googleUser.authentication.idToken);
      return this.auth.signInWithCredential(credential);
    } else {
      const provider = new firebase.auth.GoogleAuthProvider();
      return this.auth.signInWithPopup(provider);
    }
  }

  async loginWithFacebook() {
    if (isPlatform('capacitor')) {
      const result = await FacebookLogin.login({ permissions: ['email', 'public_profile'] });
      if (result.accessToken) {
        const credential = firebase.auth.FacebookAuthProvider.credential(result.accessToken.token);
        return this.auth.signInWithCredential(credential);
      } else {
        return null;
      }
    } else {
      const provider = new firebase.auth.FacebookAuthProvider();
      return this.auth.signInWithPopup(provider);
    }
  }

  
  // =============== crear un usuario ==========================
  signUp(user: User) {
    return createUserWithEmailAndPassword(getAuth(), user.email, user.password);
  }
  // =============== Actualizar usuario ==========================

  updateUser(displayName: string) {
    return updateProfile(getAuth().currentUser, { displayName });
  }


  // =============== Enviar email para restablecer la contraseña ==========================
  sendRecoveryEmail(email: string) {
    return sendPasswordResetEmail(getAuth(), email);
  }

  // =============== Cerrar Sessión ==========
  async signOut() {
    try {
      // Obtener el usuario actual antes de cerrar sesión
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Limpiar la sesión del dispositivo en Firebase
        const userPath = `users/${currentUser.uid}`;
        await this.updateDocumet(userPath, { 
          device_session: null 
        });
        console.log('Sesión de dispositivo eliminada exitosamente');
      }
      
      // Cerrar sesión en Firebase Auth
      await auth.signOut();
      
      // Limpiar localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('terms');
      localStorage.removeItem('direccion');
      localStorage.clear();
      
      // Redirigir al inicio
      this.utilsSvc.routerLink('/inicio');
      
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      
      // Aún así cerrar sesión localmente en caso de error
      getAuth().signOut();
      localStorage.clear();
      this.utilsSvc.routerLink('/inicio');
    }
  }

  async signOutAutomatic() {
    try {
      // Obtener el usuario actual antes de cerrar sesión
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        // Limpiar la sesión del dispositivo en Firebase
        const userPath = `users/${currentUser.uid}`;
        await this.updateDocumet(userPath, { 
          device_session: null 
        });
        console.log('Sesión de dispositivo eliminada automáticamente');
      }
      
      // Cerrar sesión en Firebase Auth
      await auth.signOut();
      
      // Limpiar localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('terms');
      localStorage.removeItem('direccion');
      localStorage.clear();
      
    } catch (error) {
      console.error('Error al cerrar sesión automática:', error);
      
      // Aún así cerrar sesión localmente en caso de error
      getAuth().signOut();
      localStorage.clear();
    }
  }


  // =============== Base de datos ==========================

  obtenerDocumentoPorId(path: string, uid: string): DocumentReference {
    return doc(getFirestore(), `${path}/${uid}`);
  }
  // =============== Obtener documentos de una coleccion ==========================
  getCollectionData(path: string, collectionQuery: any[] = []) {
    const ref = collection(getFirestore(), path);
    return collectionData(query(ref, ...collectionQuery), { idField: 'id' });
  }

  getCollectionDatas(path: string, collectionQuery: any[] = []) {
    const ref = collection(getFirestore(), path);
    
    // Asegúrate de que `collectionQuery` contenga condiciones `where` correctas
    const q = query(ref, ...collectionQuery);
    
    return collectionData(q, { idField: 'id' });
  }

  // =============== Obtener documentos de una coleccion ==========================
  obtenerColeccion(path: string) {
    return this.firestore.collection(path).valueChanges(); // Esto debe devolver un Observable de la colección.
  }

  // =============== Obtener documentos de una subcoleccion ==========================
  obtenerSubColeccion(path: string) {
    return this.firestore.collection(path).valueChanges({ idField: 'uid' });
  }

  // =============setear un documento ==========================

  setDocumet(path: string, data: any) {
    return setDoc(doc(getFirestore(), path), data);
  }

  // =============Actualizar  un documento ==========================

  // Método para actualizar documento
  async updateDocumet(path: string, data: any) {
    return updateDoc(doc(getFirestore(), path), data);
  }

  // =============Eliminar  un documento ==========================

  deleteDocumet(path: string) {
    return deleteDoc(doc(getFirestore(), path));
  }


  // ============= obtener un documento ==========================
  async getDocument(path: string) {
    return (await getDoc(doc(getFirestore(), path))).data();

  }

  // ============= Agregar  un documento ==========================
  addDocument(path: string, data: any) {
    return addDoc(collection(getFirestore(), path), data);
  }

  // ============= Agregar  un documento ==========================
  setDocument(path: string, data: any) {
    const docRef = doc(getFirestore(), path); // path es la ruta completa del documento
    return setDoc(docRef, data);
  }

  // Método para agregar un documento y asignar el uid
  addDocumentWithUid(path: string, data: any) {
    const docRef = doc(collection(getFirestore(), path)); // Obtén referencia del documento sin id
    return setDoc(docRef, { ...data, uid: docRef.id }); // Asigna el uid como el id generado por Firebase
  }

  /*===========CREAR DIRECCION DE USUARIO==============*/
  adddireccion(path:string, data:any){
    return addDoc(collection(getFirestore(),path),data);
  }
  
  /*===========ACTUALIZAR DIRECCION USUARIO==============*/
  updateUserDireccion(path:string, data:any){
    const auth = getAuth();
    return updateDoc(doc(getFirestore(),path), data);
  }

  // ============= Almacenamiento ==========================

  // ===========Subir imagen==========================
  async uploadImage(path: string, data_url: string) {
    return uploadString(ref(getStorage(), path), data_url, 'data_url').then(() => {
      return getDownloadURL(ref(getStorage(), path));
    })

  }

  // ========== Obtener la imagen de su ruta con su url ===================
  async getFilePath(url: string) {
    return ref(getStorage(), url).fullPath

  }

  // ========== Obtener la imagen de su ruta con su url ===================
  deleteFile(path: string) {
    return deleteObject(ref(getStorage(), path));

  }




  //========================METODOS PARA OBTENER DATOS DE GRAFICAS=============================================

  getVentasDiarias(): Observable<any[]> {
    return this.firestore.collection('ventas_diarias').valueChanges();
  }

  getGananciasSemanales(): Observable<any[]> {
    return this.firestore.collection('pedidos').valueChanges().pipe(
      map((pedidos: any[]) => {
        const hoy = new Date();
        const primerDiaSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay()));
        const ultimoDiaSemana = new Date(hoy.setDate(hoy.getDate() - hoy.getDay() + 6));

        // Filtrar pedidos confirmados y dentro de la semana actual
        const pedidosFiltrados = pedidos.filter(pedido => {
          const fechaPedido = pedido.fecha?.toDate ? pedido.fecha.toDate() : new Date(pedido.fecha);
          return pedido.pago_confirmado && fechaPedido >= primerDiaSemana && fechaPedido <= ultimoDiaSemana;
        });

        // Combinar totales por fecha
        const ventasPorDia = pedidosFiltrados.reduce((acumulador, pedido) => {
          const fecha = pedido.fecha?.toDate ? pedido.fecha.toDate() : new Date(pedido.fecha);
          const dia = fecha.toISOString().split('T')[0]; // Formato YYYY-MM-DD

          if (!acumulador[dia]) {
            acumulador[dia] = 0;
          }
          acumulador[dia] += pedido.total || 0; // Sumar el total, asegurando que no sea undefined
          return acumulador;
        }, {} as { [key: string]: number });

        // Convertir el mapa en un array con formato de fecha DD-MM-AAAA
        return Object.entries(ventasPorDia).map(([dia, total]) => {
          const [year, month, day] = dia.split('-'); // Separar el formato YYYY-MM-DD
          return {
            dia: `${day}-${month}-${year}`, // Formato DD-MM-AAAA
            total,
          };
        });
      })
    );
  }

  getVentasMensuales(): Observable<any[]> {
    return this.firestore.collection('ventas_mensuales').valueChanges();
  }

  getVentasAnuales(): Observable<any[]> {
    return this.firestore.collection('ventas_anuales').valueChanges();
  }

  getGastosSemanales(): Observable<any[]> {
    const ref = collection(getFirestore(), 'gastos');
  
    return collectionData(ref, { idField: 'id' }).pipe(
      map((gastos: any[]) => {
        // Obtener el mes y año actual
        const hoy = new Date();
        const mesActual = hoy.getMonth(); // Mes actual (0 = Enero, 11 = Diciembre)
        const añoActual = hoy.getFullYear(); // Año actual
  
        // Filtrar solo los gastos del mes y año actuales
        const gastosFiltrados = gastos.filter(gasto => {
          const fecha = gasto.fecha?.toDate ? gasto.fecha.toDate() : new Date(gasto.fecha);
          return fecha.getMonth() === mesActual && fecha.getFullYear() === añoActual;
        });
  
        // Crear un mapa para agrupar los pagos por día
        const pagosPorDia = gastosFiltrados.reduce((acumulador, gasto) => {
          const fecha = gasto.fecha?.toDate ? gasto.fecha.toDate() : new Date(gasto.fecha);
          const dia = fecha.toISOString().split('T')[0]; // Formato YYYY-MM-DD
  
          if (!acumulador[dia]) {
            acumulador[dia] = 0;
          }
          acumulador[dia] += gasto.pago || 0; // Sumar el pago, asegurando que no sea undefined
          return acumulador;
        }, {} as { [key: string]: number });
  
        // Convertir el mapa en un array con formato de fecha DD-MM-AAAA
        return Object.entries(pagosPorDia).map(([dia, total]) => {
          const [year, month, day] = dia.split('-'); // Separar el formato YYYY-MM-DD
          return {
            dia: `${day}-${month}-${year}`, // Formato DD-MM-AAAA
            total,
          };
        });
      })
    );
  }

  getDailyProductReport(): Observable<any[]> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Set to start of the day
  
    return this.getCollectionData('productos').pipe(
      map((productos: any[]) => {
        const productMap = new Map(productos.map(producto => [producto.uid, { nombre: producto.nombre, cantidad: 0 }]));
        return productMap;
      }),
      switchMap(productMap => 
        this.getCollectionData('pedidos', [where('pago_confirmado', '==', true), where('fecha', '>=', hoy)]).pipe(
          switchMap((pedidos: any[]) => {
            const detallePedidosObservables = pedidos.map(pedido => this.getDetallePedido(pedido.id));
            return forkJoin(detallePedidosObservables).pipe(
              map((detallesPedidos: any[][]) => {
                for (const detalles of detallesPedidos) {
                  for (const detalle of detalles) {
                    if (productMap.has(detalle.uid_producto)) {
                      productMap.get(detalle.uid_producto).cantidad += detalle.cantidad;
                    }
                  }
                }
                return Array.from(productMap.values());
              })
            );
          })
        )
      )
    );
  }
  
  getDetallePedido(pedidoId: string): Observable<any[]> {
    return this.obtenerSubColeccion(`pedidos/${pedidoId}/detalle_pedido`);
  }


  // Método para obtener el tipo de perfil por correo
  getUserTypeProfileByEmail(email: string): Observable<any> {
    return this.firestore.collection('users', ref => ref.where('email', '==', email))
      .valueChanges({ idField: 'id' });
  }

  // Método para verificar el password_Change
  getPasswordChangeByEmail(email: string): Observable<any> {
    return this.firestore.collection('users', ref => ref.where('email', '==', email))
      .valueChanges({ idField: 'id' });
  }

  async isWithinOperatingHours(): Promise<boolean> {
    const horarioDoc = await this.getDocument('horario/waeYL5UAeC3YyZ8BW3KT');
    if (!horarioDoc || !horarioDoc['hora_entrada'] || !horarioDoc['hora_salida']) {
      throw new Error('No se pudo obtener el documento de horario o está incompleto.');
    }
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes(); // Convert current time to minutes
    const [startHour, startMinutes] = horarioDoc['hora_entrada'].split(':').map(Number);
    const [endHour, endMinutes] = horarioDoc['hora_salida'].split(':').map(Number);
    const startTime = startHour * 60 + startMinutes; // Convert start time to minutes
    const endTime = endHour * 60 + endMinutes; // Convert end time to minutes

    return currentTime >= startTime && currentTime <= endTime;
  }

  obtenerColeccionFecha(path: string): Observable<any[]> {
    const hoy = new Date();
    const hoyFecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()); // Solo la fecha, sin la hora
  
    return this.firestore.collection(path).valueChanges({ idField: 'id' }).pipe(
      map((items: any[]) => 
        items
          .map(item => ({
            ...item,
            fecha: item.fecha instanceof Timestamp ? item.fecha.toDate() : item.fecha
          }))
          .filter(item => {
            const itemFecha = new Date(item.fecha);
            // Compara solo la fecha, sin considerar la hora
            return itemFecha.getFullYear() === hoyFecha.getFullYear() &&
                   itemFecha.getMonth() === hoyFecha.getMonth() &&
                   itemFecha.getDate() === hoyFecha.getDate();
          })
      )
    );
  }


  getMontoFinalDia(): Observable<number> {
    const hoy = new Date();
    // Configura la fecha de inicio y fin del día sin considerar las horas
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0)); // Inicio del día actual
    const finDia = new Date(hoy.setHours(23, 59, 59, 999)); // Fin del día actual
  
    // Consulta a la colección de pedidos donde pago_confirmado es true y la fecha es hoy
    return this.firestore.collection('pedidos', ref => 
      ref
        .where('pago_confirmado', '==', true)
        .where('fecha', '>=', inicioDia)
        .where('fecha', '<=', finDia)
    ).valueChanges().pipe(
      map((pedidos: any[]) => {
        // Sumar los valores de 'total' de los pedidos filtrados
        return pedidos.reduce((total, pedido) => total + (pedido.total || 0), 0);
      }),
      catchError(error => {
        console.error('Error al obtener el monto final:', error);
        return of(0); // Si ocurre un error, devolver 0
      })
    );
  }

  // Método para verificar si el email ya existe
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const methods = await this.auth.fetchSignInMethodsForEmail(email);
      return methods.length > 0;
    } catch (error) {
      console.error('Error checking email existence:', error);
      return false;
    }
  }
}