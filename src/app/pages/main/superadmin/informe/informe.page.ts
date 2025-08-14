import { Component, inject, OnInit } from '@angular/core';
import { Chart } from 'chart.js/auto';
import { where } from 'firebase/firestore';
import { FirebaseService } from 'src/app/services/firebase.service';

@Component({
  selector: 'app-informe',
  templateUrl: './informe.page.html',
  styleUrls: ['./informe.page.scss'],
})
export class InformePage implements OnInit {
  chart: any;
  firebaseSvc = inject(FirebaseService);
  ventasDiarias: any[] = [];
  ventasSemanales: any[] = [];
  ventasMensuales: any[] = [];
  ventasAnuales: any[] = [];

  dataSemanal: any[] = [];
  dataSemanalGastos: any[] = [];

  constructor() { }

  ngOnInit() {
    this.renderChartDiarioK();
    this.renderChartDiarioP();
    this.renderChartMensual();
    this.renderChartAnual();

    this.loadData(); 
    this.firebaseSvc.getGastosSemanales().subscribe({
      next: (data) => {
        this.dataSemanalGastos = data;
        this.firebaseSvc.getGananciasSemanales().subscribe({
          next: (data) => {
            this.dataSemanal = data;
            this.renderChart();
            console.log("Ganancias Semanales:", data);
          },
          error: (err) => console.error('Error al obtener ganancias semanales:', err),
        });
        console.log("Gastos Semanales:", data);
      },
      error: (err) => console.error('Error al obtener ganancias semanales:', err),
    });

    

  }

  getGastosSemanales() {
    this.firebaseSvc.getGastosSemanales().subscribe({
      next: (data) => {
        this.dataSemanalGastos = data;
        this.renderChart();
        console.log("Gastos Semanales:", data);
      },
      error: (err) => console.error('Error al obtener ganancias semanales:', err),
    });
  }

  doRefresh(event) {
    setTimeout(() => {
      event.target.complete();
    }, 1000);
  }

  renderChart() {
    const allDates = new Set([...this.dataSemanal.map(item => item.dia), ...this.dataSemanalGastos.map(item => item.dia)]);
    const labels = Array.from(allDates).sort(); // Fechas ordenadas
    const valores = labels.map(label => {
      const item = this.dataSemanal.find(data => data.dia === label);
      return item ? item.total : 0; // Totales de pagos por día, 0 si no hay información
    });
    const gastos = labels.map(label => {
      const item = this.dataSemanalGastos.find(data => data.dia === label);
      return item ? item.total : 0; // Totales de pagos por día, 0 si no hay información
    });
  
    new Chart('miGraficaSemanal', {
      type: 'line', // Cambiar el tipo de gráfica a 'line'
      data: {
        labels: labels, // Días
        datasets: [{
          label: 'Ganancias diarias',
          data: valores, // Totales de pagos por día
          backgroundColor: 'rgba(75, 192, 192, 0.2)', // Fondo del área bajo la línea
          borderColor: 'rgba(75, 192, 192, 1)', // Color de la línea
          borderWidth: 2,
          pointBackgroundColor: 'rgba(75, 192, 192, 1)', // Color de los puntos
          tension: 0.4, // Suavidad de la línea (0 para líneas rectas)
          fill: true // Rellenar el área debajo de la línea
        },
        {
          label: 'Gastos diarios',
          data: gastos, // Totales de pagos por día
          backgroundColor: 'rgba(255, 99, 132, 0.6)', // Fondo del área bajo la línea
          borderColor: 'rgba(255, 99, 132, 1)', // Color de la línea
          borderWidth: 2,
          pointBackgroundColor: 'rgba(255, 99, 132, 1)', // Color de los puntos
          tension: 0.4, // Suavidad de la línea (0 para líneas rectas)
          fill: true // Rellenar el área debajo de la línea
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          title: { display: true, text: 'Pagos Diarios Semanales' }
        },
        scales: {
          x: {
            title: {
              display: true,
              text: 'Días'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Total de Pagos'
            },
            beginAtZero: true // Asegura que el eje Y comience en 0
          }
        }
      }
    });
  }


  loadData() {
  }


  // Renderiza las gráficas
  renderChartDiarioK() {
    this.firebaseSvc.getCollectionData('productos').subscribe((productos: any[]) => {
      const labels = productos.map(producto => producto.nombre); // Obtener nombres de productos
      const cantidadesPorProducto: { [nombreProducto: string]: number } = {};

      // Inicializar todas las cantidades en 0
      labels.forEach(nombreProducto => {
        cantidadesPorProducto[nombreProducto] = 0;
      });
      

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0); // Establecer al inicio del día actual

      const mañana = new Date();
      mañana.setDate(hoy.getDate() + 1);
      mañana.setHours(0, 0, 0, 0); // Establecer al inicio del día siguiente

      this.firebaseSvc.getCollectionData('pedidos', [
        where("pago_confirmado", "==", true),
        where("fecha", ">=", hoy),
        where("fecha", "<", mañana)
      ]).subscribe((pedidos: any[]) => {
        const uid_pedidos = pedidos.map(pedido => pedido.id);

        for (let i = 0; i < uid_pedidos.length; i++) {

          // Acceder a los detalles del pedido
          this.firebaseSvc.getCollectionData(`pedidos/${uid_pedidos[i]}/detalle_pedido`).subscribe((detalles: any[]) => {
            detalles.forEach(detalle => {
              this.firebaseSvc.getDocument(`productos/${detalle.uid_producto}`).then((producto) => {

                const nombreProducto = producto['nombre']; // Asegúrate de que el detalle contiene este campo
                const cantidad = detalle.cantidad;
                // Incrementar la cantidad del producto
                if (nombreProducto in cantidadesPorProducto) {
                  cantidadesPorProducto[`${nombreProducto}`] += cantidad;
                } 
                
              });
              
            });
            
            
          });
        }
        
        
      });
      const ctx = document.getElementById('ChartDiarioK') as HTMLCanvasElement;
      setTimeout(() => {
        const valoresOrdenados = labels.map(label => cantidadesPorProducto[label] || 0);

        
        this.chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,  // Usa los nombres de los productos
            datasets: [
              {
                label: 'Reporte diario',
                data:valoresOrdenados,  // Usa las cantidades por producto
                backgroundColor: [
                  'rgba(255, 99, 132, 0.6)',   // Color para Enero
                  'rgba(54, 162, 235, 0.6)',   // Color para Febrero
                  'rgba(255, 206, 86, 0.6)',   // Color para Marzo
                  'rgba(75, 192, 192, 0.6)',   // Color para Abril
                  'rgba(153, 102, 255, 0.6)',  // Color para Mayo
                  'rgba(255, 159, 64, 0.6)'    // Color para Junio
                ],
                borderColor: [
                  'rgba(255, 99, 132, 1)',
                  'rgba(54, 162, 235, 1)',
                  'rgba(255, 206, 86, 1)',
                  'rgba(75, 192, 192, 1)',
                  'rgba(153, 102, 255, 1)',
                  'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return value + ' kg/bolsa'; // Agregar texto al valor del eje Y
                  }
                }
              },
              x: {
                beginAtZero: true
              }
            }
          }
        });
      }, 1000);
      
    });
  }
  

  renderChartDiarioP() {
    this.firebaseSvc.getCollectionData('productos').subscribe((productos: any[]) => {
      const labels = productos.map(producto => producto.nombre); // Obtener nombres de productos
      const cantidadesPorProducto: { [nombreProducto: string]: number } = {};

      // Inicializar todas las cantidades en 0
      labels.forEach(nombreProducto => {
        cantidadesPorProducto[nombreProducto] = 0;
      });
      

      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0); // Establecer al inicio del día actual

      const mañana = new Date();
      mañana.setDate(hoy.getDate() + 1);
      mañana.setHours(0, 0, 0, 0); // Establecer al inicio del día siguiente

      this.firebaseSvc.getCollectionData('pedidos', [
        where("pago_confirmado", "==", true),
        where("fecha", ">=", hoy),
        where("fecha", "<", mañana)
      ]).subscribe((pedidos: any[]) => {
        const uid_pedidos = pedidos.map(pedido => pedido.id);

        for (let i = 0; i < uid_pedidos.length; i++) {

          // Acceder a los detalles del pedido
          this.firebaseSvc.getCollectionData(`pedidos/${uid_pedidos[i]}/detalle_pedido`).subscribe((detalles: any[]) => {
            detalles.forEach(detalle => {
              this.firebaseSvc.getDocument(`productos/${detalle.uid_producto}`).then((producto) => {

                const nombreProducto = producto['nombre']; // Asegúrate de que el detalle contiene este campo
                const cantidad = detalle.subtotal;
                // Incrementar la cantidad del producto
                if (nombreProducto in cantidadesPorProducto) {
                  cantidadesPorProducto[`${nombreProducto}`] += cantidad;
                } 
                
              });
              
            });
            
            
          });
        }
        
        
      });
      const ctx = document.getElementById('ChartDiarioP') as HTMLCanvasElement;
      setTimeout(() => {
        const valoresOrdenados = labels.map(label => cantidadesPorProducto[label] || 0);

        
        this.chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,  // Usa los nombres de los productos
            datasets: [
              {
                label: 'Reporte diario',
                data:valoresOrdenados,  // Usa las cantidades por producto
                backgroundColor: [
                  'rgba(255, 99, 132, 0.6)',   // Color para Enero
                  'rgba(54, 162, 235, 0.6)',   // Color para Febrero
                  'rgba(255, 206, 86, 0.6)',   // Color para Marzo
                  'rgba(75, 192, 192, 0.6)',   // Color para Abril
                  'rgba(153, 102, 255, 0.6)',  // Color para Mayo
                  'rgba(255, 159, 64, 0.6)'    // Color para Junio
                ],
                borderColor: [
                  'rgba(255, 99, 132, 1)',
                  'rgba(54, 162, 235, 1)',
                  'rgba(255, 206, 86, 1)',
                  'rgba(75, 192, 192, 1)',
                  'rgba(153, 102, 255, 1)',
                  'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return '$'+value; // Agregar texto al valor del eje Y
                  }
                }
              },
              x: {
                beginAtZero: true
              }
            }
          }
        });
      }, 1000);
      
    });
  }



  renderChartMensual() {
    const ctx = document.getElementById('ChartMensual') as HTMLCanvasElement;
    const añoActual = new Date().getFullYear(); // Obtener el año actual
    const meses = [
      "Enero", 
      "Febrero", 
      "Marzo", 
      "Abril", 
      "Mayo", 
      "Junio", 
      "Julio", 
      "Agosto", 
      "Septiembre", 
      "Octubre", 
      "Noviembre", 
      "Diciembre"];
    
      const TotalPorMes: { [key: string]: number } = {};
      const nombresMeses = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", 
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
      ];
      const currentYear = new Date().getFullYear(); // Cambié el nombre de la variable
      
      for (let mes = 0; mes < 12; mes++) {
        // Crear el inicio y fin del mes
        const inicioMes = new Date(currentYear, mes, 1); // Primer día del mes
        const finMes = new Date(currentYear, mes + 1, 1); // Primer día del mes siguiente
      
        // Ajustar la fecha de fin para el rango correcto
        finMes.setHours(0, 0, 0, 0);
      
        // Inicializar el total del mes en el objeto
        TotalPorMes[nombresMeses[mes]] = 0;
      
        // Consultar los pedidos en el rango del mes actual
        this.firebaseSvc.getCollectionData('pedidos', [
          where("pago_confirmado", "==", true),
          where("fecha", ">=", inicioMes),
          where("fecha", "<", finMes)
        ]).subscribe((pedidos: any[]) => {
          // Sumar los totales de los pedidos del mes actual
          pedidos.forEach((pedido) => {
            TotalPorMes[nombresMeses[mes]] += pedido.total || 0;
          });
      
          // Imprimir el total actualizado del mes
          console.log(`Total para ${nombresMeses[mes]}: ${TotalPorMes[nombresMeses[mes]]}`);
        });
      }
      
      console.log(TotalPorMes);
      setTimeout(() => {
        this.chart = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: meses,
            datasets: [
              {
                label: 'Reporte diario',
                data: TotalPorMes,
                backgroundColor: [
                  'rgba(255, 99, 132, 0.6)',   // Color para Enero
                  'rgba(54, 162, 235, 0.6)',   // Color para Febrero
                  'rgba(255, 206, 86, 0.6)',   // Color para Marzo
                  'rgba(75, 192, 192, 0.6)',   // Color para Abril
                  'rgba(153, 102, 255, 0.6)',  // Color para Mayo
                  'rgba(255, 159, 64, 0.6)'    // Color para Junio
                ],
                borderColor: [
                  'rgba(255, 99, 132, 1)',
                  'rgba(54, 162, 235, 1)',
                  'rgba(255, 206, 86, 1)',
                  'rgba(75, 192, 192, 1)',
                  'rgba(153, 102, 255, 1)',
                  'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
              }
            ]
          },
          options: {
            responsive: true,
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function(value) {
                    return '$ ' + value; // Agregar texto al valor del eje Y
                  }
                }
              },
              x: {
                beginAtZero: true
              }
            }
          }
        });
      }, 1500);

  }

  renderChartAnual() {
    const ctx = document.getElementById('ChartAnual') as HTMLCanvasElement;
    const currentYear = new Date().getFullYear();
    const years = [currentYear - 2, currentYear - 1, currentYear];
    const TotalPorAño: { [key: number]: number } = {};

    years.forEach(year => {
      // Inicializar el total del año en el objeto
      TotalPorAño[year] = 0;

      // Crear el inicio y fin del año
      const inicioAño = new Date(year, 0, 1); // Primer día del año
      const finAño = new Date(year + 1, 0, 1); // Primer día del año siguiente

      // Consultar los pedidos en el rango del año actual
      this.firebaseSvc.getCollectionData('pedidos', [
        where("pago_confirmado", "==", true),
        where("fecha", ">=", inicioAño),
        where("fecha", "<", finAño)
      ]).subscribe((pedidos: any[]) => {
        // Sumar los totales de los pedidos del año actual
        pedidos.forEach((pedido) => {
          TotalPorAño[year] += pedido.total || 0;
        });

        // Imprimir el total actualizado del año
        console.log(`Total para ${year}: ${TotalPorAño[year]}`);
      });
    });

    setTimeout(() => {
      this.chart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: years.map(year => year.toString()), // Convertir años a cadenas
          datasets: [
            {
              label: 'Reporte anual',
              data: years.map(year => TotalPorAño[year] || 0), // Usa los totales por año
              backgroundColor: [
                'rgba(255, 99, 132, 0.6)',   // Color para Enero
                'rgba(54, 162, 235, 0.6)',   // Color para Febrero
                'rgba(255, 206, 86, 0.6)',   // Color para Marzo
                'rgba(75, 192, 192, 0.6)',   // Color para Abril
                'rgba(153, 102, 255, 0.6)',  // Color para Mayo
                'rgba(255, 159, 64, 0.6)'    // Color para Junio 
              ],
              borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
              ],
              borderWidth: 1,
              hoverOffset: 2
            }
          ]
        },
        options: {
          responsive: true,
        }
      });
    }, 1500);
  }

}
