// Importar DataShareService como módulo
import { saveJobOffer } from './Data/DataShareService.js';

// Manejar atajos de teclado
chrome.commands.onCommand.addListener((command) => {
  if (command === "_execute_action") {
    handleSaveJobOffer();
  }
});

// Función para guardar la oferta de trabajo actual
async function handleSaveJobOffer() {
  try {
    // Obtener la pestaña activa
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tabs || tabs.length === 0) {
      showNotification('No se encontró pestaña activa');
      return;
    }
    
    const activeTab = tabs[0];
    
    // Obtener título y URL de la pestaña activa
    const title = activeTab.title || "";
    const url = activeTab.url || "";
    
    // Guardar la oferta con el HTML de la página
    await saveJobOffer({ title, url });
    
    // Mostrar notificación de éxito
    showNotification('Oferta guardada correctamente');
    
  } catch (error) {
    console.error('Error al guardar la oferta:', error);
    showNotification(`Error: ${error.message || 'No se pudo guardar la oferta'}`);
  }
}

// Función para mostrar notificaciones
function showNotification(message) {
  chrome.notifications?.create({
    type: 'basic',
    iconUrl: 'images/icon128.png',
    title: 'AutoGrid Job Saver',
    message: message
  });
}
