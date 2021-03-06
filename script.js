const tieneSoporteUserMedia = () =>
    !!(navigator.getUserMedia || (navigator.mozGetUserMedia || navigator.mediaDevices.getUserMedia) || navigator.webkitGetUserMedia || navigator.msGetUserMedia)
const _getUserMedia = (...arguments) =>
    (navigator.getUserMedia || (navigator.mozGetUserMedia || navigator.mediaDevices.getUserMedia) || navigator.webkitGetUserMedia || navigator.msGetUserMedia).apply(navigator, arguments);

// Declaramos elementos del DOM
const $video = document.querySelector("#video"),
    $video_original = document.querySelector("#video_tamaño_original"),
    $canvas = document.querySelector("#canvas"),
    $estado = document.querySelector("#estado"),
    $boton = document.querySelector("#botonTomarFotos"),
    $listaDeDispositivos = document.querySelector("#listaDeDispositivos");

const limpiarSelect = () => {
    for (let x = $listaDeDispositivos.options.length - 1; x >= 0; x--)
        $listaDeDispositivos.remove(x);
};
const obtenerDispositivos = () => navigator
    .mediaDevices
    .enumerateDevices();

// La función que es llamada después de que ya se dieron los permisos
// Lo que hace es llenar el select con los dispositivos obtenidos
const llenarSelectConDispositivosDisponibles = () => {

    limpiarSelect();
    obtenerDispositivos()
        .then(dispositivos => {
            const dispositivosDeVideo = [];
            dispositivos.forEach(dispositivo => {
                const tipo = dispositivo.kind;
                if (tipo === "videoinput") {
                    dispositivosDeVideo.push(dispositivo);
                }
            });

            // Vemos si encontramos algún dispositivo, y en caso de que si, entonces llamamos a la función
            if (dispositivosDeVideo.length > 0) {
                // Llenar el select
                let numeroCamara = 0;
                dispositivosDeVideo.forEach(dispositivo => {
                    numeroCamara += 1;
                    const option = document.createElement('option');
                    option.value = dispositivo.deviceId;
                    option.text = `Camara ${numeroCamara}`;
                    $listaDeDispositivos.appendChild(option);
                });
            }
        });
}




(function () {
    // Comenzamos viendo si tiene soporte, si no, nos detenemos
    if (!tieneSoporteUserMedia()) {
        alert("Lo siento. Tu navegador no soporta esta característica");
        $estado.innerHTML = "Parece que tu navegador no soporta esta característica. Intenta actualizarlo.";
        return;
    }
    //Aquí guardaremos el stream globalmente
    let stream;


    // Comenzamos pidiendo los dispositivos
    obtenerDispositivos()
        .then(dispositivos => {
            // Vamos a filtrarlos y guardar aquí los de vídeo
            const dispositivosDeVideo = [];

            // Recorrer y filtrar
            dispositivos.forEach(function (dispositivo) {
                const tipo = dispositivo.kind;
                if (tipo === "videoinput") {
                    dispositivosDeVideo.push(dispositivo);
                }
            });

            // Vemos si encontramos algún dispositivo, y en caso de que si, entonces llamamos a la función
            // y le pasamos el id de dispositivo
            if (dispositivosDeVideo.length > 1) {
                // Mostrar stream con el ID del primer dispositivo, la segunda camara
                mostrarStream(dispositivosDeVideo[1].deviceId);
            } else if (dispositivosDeVideo.length == 1) {
                // Mostrar stream con el ID del primer dispositivo, la primera camara y quitar la opcion cambiar camara
                mostrarStream(dispositivosDeVideo[0].deviceId);
                $listaDeDispositivos.style.display = "none";
                document.querySelector("#cambiarCamara").style.display = "none"
            }
        });



    const mostrarStream = idDeDispositivo => {
        _getUserMedia({
            video: {
                // Justo aquí indicamos cuál dispositivo usar
                deviceId: idDeDispositivo,
            }
        },
            (streamObtenido) => {
                // Aquí ya tenemos permisos, ahora sí llenamos el select,
                // pues si no, no nos daría el nombre de los dispositivos
                llenarSelectConDispositivosDisponibles();

                // Escuchar cuando seleccionen otra opción y entonces llamar a esta función
                $listaDeDispositivos.onchange = () => {
                    // Detener el stream
                    if (stream) {
                        stream.getTracks().forEach(function (track) {
                            track.stop();
                        });
                    }
                    // Mostrar el nuevo stream con el dispositivo seleccionado
                    mostrarStream($listaDeDispositivos.value);
                }

                // Simple asignación
                stream = streamObtenido;

                // Mandamos el stream de la cámara al elemento de vídeo
                $video.srcObject = stream;
                $video_original.srcObject = stream;
                $video.play();
                $video_original.play();

                //Escuchar el click del botón para tomar la foto
                //Escuchar el click del botón para tomar la foto
                $boton.addEventListener("click", async function () {
                    $boton.style.display = "none";
                    //Pausar reproducción
                    $video.pause();
                    $video_original.pause();
                    console.log($video.videoWidth)
                    console.log($video.videoHeight)
                    console.log($video_original.videoWidth)
                    console.log($video_original.videoHeight)


                    //Obtener contexto del canvas y dibujar sobre él
                    let contexto = $canvas.getContext("2d");
                    $canvas.width = $video_original.videoWidth;
                    $canvas.height = $video_original.videoHeight;
                    contexto.drawImage($video_original, 0, 0, $canvas.width, $canvas.height);

                    let foto = $canvas.toDataURL(); //Esta es la foto, en base 64
                    $estado.innerHTML = "Enviando foto. Por favor, espera...";

                    // enviar a cloudinary
                    const urlCloudinary = "https://api.cloudinary.com/v1_1/jahimercloud/auto/upload";
                    const formData = new FormData();

                    formData.append("file", foto);
                    formData.append("upload_preset", "ee6ppqwp");

                    await fetch(urlCloudinary, {
                        method: "POST",
                        body: formData
                    }).then(response => {
                        return response.json()
                    }).then(res => {
                        console.log("La foto fue enviada correctamente", res);
                        $estado.innerHTML = `Foto guardada en la nube con éxito. puedes verla <a target="_blank" href="${res.url}">aqui</a>`;
                    });
                    //Reanudar reproducción
                    $video.play();
                    $video_original.play();
                    $boton.style.display = ""
                });
            }, (error) => {
                console.log("Permiso denegado o error: ", error);
                $estado.innerHTML = "No se puede acceder a la cámara, o no diste permiso.";
            });
    }
})();