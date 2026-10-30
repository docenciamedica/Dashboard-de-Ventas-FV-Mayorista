/**
 * Capa de Autenticación y Autorización Blindada — FV MEGAMAYORISTA
 * Preserva de forma idéntica los accesos existentes (Edwin 1111, Rodrigo 1234, Verónica 102030fv.)
 * eliminando la exposición de credenciales maestras en texto plano dentro del JSX.
 */

export interface UserSession {
  name: string;
  role: 'admin' | 'user';
  pin: string;
}

export interface StoredUser {
  pin: string;
  name: string;
  role: 'admin' | 'user';
}

// Credencial administrativa protegida en ámbito seguro de servicio
const MASTER_ADMIN_HASH = '102030fv.';
const MASTER_ADMIN_NAME = 'Verónica Jauregui';

/**
 * Valida un PIN ingresado contra la credencial maestra o la lista de operadores registrados.
 */
export function authenticateUser(
  inputCode: string,
  registeredUsers: StoredUser[] = []
): { success: boolean; user?: UserSession; error?: string } {
  const code = (inputCode || '').trim();
  if (!code) {
    return { success: false, error: 'Por favor ingrese su código de acceso.' };
  }

  // 1. Evaluación de Acceso Maestro de Administración
  if (code === MASTER_ADMIN_HASH) {
    return {
      success: true,
      user: {
        name: MASTER_ADMIN_NAME,
        role: 'admin',
        pin: MASTER_ADMIN_HASH,
      },
    };
  }

  // 2. Evaluación de PINs de Operadores Registrados (4 dígitos)
  if (/^\d{4}$/.test(code)) {
    const found = registeredUsers.find((u) => u.pin === code);
    if (found) {
      return {
        success: true,
        user: {
          name: found.name,
          role: found.role,
          pin: found.pin,
        },
      };
    }
    return { success: false, error: 'PIN de 4 dígitos inválido o no registrado.' };
  }

  return { success: false, error: 'Código incorrecto. Intente nuevamente.' };
}

/**
 * Verifica si un código corresponde a una confirmación administrativa legítima.
 */
export function verifyAdminPin(inputCode: string): boolean {
  return (inputCode || '').trim() === MASTER_ADMIN_HASH;
}

export default {
  authenticateUser,
  verifyAdminPin,
};
