import JSZip from 'jszip';

export interface ExtractedFile {
  path: string; // Relative path within the ZIP (e.g., "docs/subfolder/file.jpg")
  file: File;
}

export interface ExtractResult {
  success: boolean;
  files: ExtractedFile[];
  error?: string;
  tree?: FolderTree; // Visual tree representation
  fileCount?: number;
  totalSize?: number;
}

export interface FolderTree {
  name: string;
  type: 'folder' | 'file';
  size?: number; // For files
  children?: FolderTree[];
}

// Tipos de archivo permitidos (mismo que en MediaLibrary)
const ALLOWED_MIME_TYPES = [
  'image/',  // Todas las imágenes
  'video/',  // Todos los videos
];

const MAX_ZIP_SIZE = 500 * 1024 * 1024; // 500MB

/**
 * Valida si un tipo MIME está permitido
 */
function isAllowedMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.some(allowed => mimeType.startsWith(allowed));
}

/**
 * Extrae archivos de un ZIP y los valida
 * @param zipFile - Archivo ZIP a procesar
 * @returns Resultado con archivos extraídos o error
 */
export async function extractFilesFromZip(zipFile: File): Promise<ExtractResult> {
  try {
    // Validar tamaño del ZIP
    if (zipFile.size > MAX_ZIP_SIZE) {
      return {
        success: false,
        files: [],
        error: `El archivo ZIP es demasiado grande. Máximo permitido: 500MB. Tu archivo: ${(zipFile.size / (1024 * 1024)).toFixed(2)}MB`
      };
    }

    // Validar que sea un ZIP
    if (!zipFile.type.includes('zip') && !zipFile.name.endsWith('.zip')) {
      return {
        success: false,
        files: [],
        error: 'El archivo debe ser un ZIP válido'
      };
    }

    // Cargar y procesar ZIP
    const jszip = new JSZip();
    const loaded = await jszip.loadAsync(zipFile);

    const extractedFiles: ExtractedFile[] = [];
    const treeRoot: FolderTree = {
      name: zipFile.name.replace('.zip', ''),
      type: 'folder',
      children: []
    };

    let totalSize = 0;
    const invalidFiles: string[] = [];

    // Iterar sobre todos los archivos en el ZIP
    for (const [filePath, zipEntry] of Object.entries(loaded.files)) {
      // Ignorar carpetas vacías (las creará el sistema automáticamente)
      if (zipEntry.dir) continue;

      // Ignorar archivos en __MACOSX (metadatos de macOS)
      if (filePath.includes('__MACOSX')) continue;

      // Ignorar archivos ocultos del sistema
      if (filePath.includes('/.') || filePath.startsWith('.')) continue;

      // Obtener el contenido del archivo
      const blob = await zipEntry.async('blob');
      const file = new File([blob], zipEntry.name, { type: blob.type });

      // Validar tipo de archivo
      if (!isAllowedMimeType(file.type)) {
        invalidFiles.push(`${filePath} (tipo: ${file.type || 'desconocido'})`);
        continue;
      }

      // Si pasó todas las validaciones, agregar a la lista
      extractedFiles.push({
        path: filePath,
        file
      });

      totalSize += file.size;
    }

    // Si hay archivos inválidos, retornar error
    if (invalidFiles.length > 0) {
      return {
        success: false,
        files: [],
        error: `Se encontraron archivos no permitidos (solo imágenes y videos):\n${invalidFiles.join('\n')}`
      };
    }

    // Si no hay archivos válidos
    if (extractedFiles.length === 0) {
      return {
        success: false,
        files: [],
        error: 'El ZIP no contiene archivos válidos (imágenes o videos)'
      };
    }

    // Construir árbol visual de carpetas
    buildFolderTree(treeRoot, extractedFiles);

    return {
      success: true,
      files: extractedFiles,
      tree: treeRoot,
      fileCount: extractedFiles.length,
      totalSize
    };
  } catch (error: any) {
    return {
      success: false,
      files: [],
      error: `Error al procesar ZIP: ${error.message}`
    };
  }
}

/**
 * Construye un árbol de carpetas a partir de los archivos extraídos
 */
function buildFolderTree(root: FolderTree, files: ExtractedFile[]): void {
  if (!root.children) root.children = [];

  for (const { path, file } of files) {
    const parts = path.split('/');
    let currentNode = root;

    // Procesar todas las carpetas excepto el nombre del archivo
    for (let i = 0; i < parts.length - 1; i++) {
      const folderName = parts[i];

      // Buscar o crear la carpeta
      let folderNode = currentNode.children?.find(
        child => child.name === folderName && child.type === 'folder'
      );

      if (!folderNode) {
        folderNode = {
          name: folderName,
          type: 'folder',
          children: []
        };
        currentNode.children?.push(folderNode);
      }

      currentNode = folderNode;
    }

    // Agregar el archivo
    const fileName = parts[parts.length - 1];
    currentNode.children?.push({
      name: fileName,
      type: 'file',
      size: file.size
    });
  }
}

/**
 * Convierte el árbol de carpetas a una representación visual string
 * Útil para mostrar en el preview
 */
export function treeToString(node: FolderTree, indent = 0): string {
  const prefix = '  '.repeat(indent);
  const icon = node.type === 'folder' ? '📁' : '📄';
  let str = `${prefix}${icon} ${node.name}`;

  if (node.type === 'file' && node.size) {
    str += ` (${formatFileSize(node.size)})`;
  }

  str += '\n';

  if (node.children) {
    for (const child of node.children) {
      str += treeToString(child, indent + 1);
    }
  }

  return str;
}

/**
 * Formatea el tamaño de archivo de manera legible
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Extrae todas las carpetas únicas de una lista de archivos
 * Útil para crear la estructura de carpetas en BD antes de subir
 */
export function extractFolderStructure(files: ExtractedFile[]): string[] {
  const folders = new Set<string>();

  for (const { path } of files) {
    const parts = path.split('/');

    // Agregar todas las carpetas padre
    for (let i = 1; i < parts.length; i++) {
      const folderPath = parts.slice(0, i).join('/');
      folders.add(folderPath);
    }
  }

  // Retornar ordenadas por profundidad (carpetas padre primero)
  return Array.from(folders).sort((a, b) => {
    const depthA = a.split('/').length;
    const depthB = b.split('/').length;
    return depthA - depthB;
  });
}
