chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        // Inyectar DataShareService.js como módulo
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["Data/DataShareService.js"]
        }, () => {
          // Inyectar el script de guardado
          chrome.scripting.executeScript({
            target: { tabId: tabs[0].id },
            func: async () => {
              try {
                // Esperar a que DataShareService esté disponible
                const titulo = document.title;
                const url = window.location.href;
                // @ts-ignore
                if (typeof guardarTrabajo !== 'function') {
                  alert('No se pudo cargar la función guardarTrabajo');
                  return;
                }
                await guardarTrabajo({ titulo, url });
                alert('Oferta guardada correctamente');
              } catch (err) {
                alert('Error al guardar la oferta: ' + (err.message || err));
              }
            }
          });
        });
      } else {
        chrome.notifications?.create({
          type: 'basic',
          iconUrl: 'images/icon128.png',
          title: 'AutoGrid',
          message: 'No se encontró pestaña activa.'
        });
      }
    });
  }
});
