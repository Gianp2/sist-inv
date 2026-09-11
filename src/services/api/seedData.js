// Initial seed data generator for clothing store demo & initial bootstrap
import { COLLECTIONS } from '../../constants/collections';
import { getCollection, addDocument, setDocument } from '../firebase/firestore';

export const INITIAL_CATEGORIES = [
  { name: 'Remeras y Chombas', description: 'Remeras lisas, estampadas, oversize y chombas', code: 'REM', active: true },
  { name: 'Pantalones y Jeans', description: 'Jeans chupín, mom, wide leg, cargos y joggers', code: 'PAN', active: true },
  { name: 'Camperas y Buzos', description: 'Buzos hoodies, camperas de abrigo, denim y puffer', code: 'CAM', active: true },
  { name: 'Vestidos y Polleras', description: 'Vestidos casuales, de fiesta, faldas y polleras', code: 'VES', active: true },
  { name: 'Calzado', description: 'Zapatillas urbanas, borcegos, sandalias y mocasines', code: 'CAL', active: true },
  { name: 'Accesorios', description: 'Cinturones, gorras, medias, carteras y mochilas', code: 'ACC', active: true },
];

export const INITIAL_BRANDS = [];

export const INITIAL_PRODUCTS = [];

export const INITIAL_CUSTOMERS = [];

export const INITIAL_SUPPLIERS = [];

export const INITIAL_SETTINGS = {
  businessName: 'Sistema Inv',
  legalName: 'Sistema Inv',
  cuit: '',
  phone: '',
  email: 'admin@sistema.com',
  address: '',
  city: '',
  currencySymbol: '$',
  currencyCode: 'ARS',
  taxName: 'IVA',
  taxRate: 21,
  receiptFooter: '¡Gracias por su compra! Cambios dentro de los 30 días con ticket.',
  cloudinaryCloudName: '',
  cloudinaryUploadPreset: '',
};

/**
 * Seed initial sample database if collections are currently empty
 */
export const seedDatabaseIfEmpty = async () => {
  try {
    // 1. Ensure essential categories exist (base clothing garment types)
    const existingCategories = await getCollection(COLLECTIONS.CATEGORIES);
    if (!existingCategories || existingCategories.length === 0) {
      for (const cat of INITIAL_CATEGORIES) {
        await addDocument(COLLECTIONS.CATEGORIES, cat);
      }
    }

    // 2. Ensure Settings exist
    const existingSettings = await getCollection(COLLECTIONS.SETTINGS);
    if (!existingSettings || existingSettings.length === 0) {
      await setDocument(COLLECTIONS.SETTINGS, 'general', INITIAL_SETTINGS);
    }

    // 3. Ensure Default Admin User and Vendedor with real Firebase accounts & UIDs
    const existingUsers = await getCollection(COLLECTIONS.USERS);
    const hasSpecificAdmin = existingUsers.some(
      (u) => u.uid === 'zvKPMDfIe0ZfwdikFBmhYCyq7w42' || u.email === 'admin@sistema.com'
    );
    if (!hasSpecificAdmin) {
      await setDocument(COLLECTIONS.USERS, 'zvKPMDfIe0ZfwdikFBmhYCyq7w42', {
        id: 'zvKPMDfIe0ZfwdikFBmhYCyq7w42',
        uid: 'zvKPMDfIe0ZfwdikFBmhYCyq7w42',
        email: 'admin@sistema.com',
        displayName: 'Administrador',
        role: 'ADMIN',
        active: true,
        createdAt: new Date().toISOString(),
      });
    }

    const hasSpecificVendedor = existingUsers.some(
      (u) => u.uid === 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1' || u.email === 'vendedor@sistema.com'
    );
    if (!hasSpecificVendedor) {
      await setDocument(COLLECTIONS.USERS, 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1', {
        id: 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1',
        uid: 'Y6zcr0uVafRbKFDkNG9RSOJeV9f1',
        email: 'vendedor@sistema.com',
        displayName: 'Vendedor Mostrador',
        role: 'EMPLEADO',
        active: true,
        createdAt: new Date().toISOString(),
      });
    }

    return true;
  } catch (error) {
    console.warn('Database initialization note:', error?.message || error);
    return false;
  }
};

export const seedInitialData = async () => {
  return await seedDatabaseIfEmpty();
};
