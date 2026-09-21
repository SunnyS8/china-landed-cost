interface Window {
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
}

interface FileSystemDirectoryHandle extends FileSystemHandle {
  entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
  getFileHandle(name: string): Promise<FileSystemFileHandle>;
}

interface FileSystemHandle {
  readonly kind: 'file' | 'directory';
  readonly name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  getFile(): Promise<File>;
}
