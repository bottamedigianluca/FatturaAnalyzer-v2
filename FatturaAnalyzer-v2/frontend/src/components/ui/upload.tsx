import React, { useCallback } from 'react';
import { useDropzone, DropzoneOptions, FileRejection } from 'react-dropzone';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface UploadProps extends DropzoneOptions {
  onFilesAccepted: (files: File[]) => void;
  className?: string;
  label?: string;
  description?: string;
}

export const Upload: React.FC<UploadProps> = ({
  onFilesAccepted,
  className,
  label = "Trascina i file qui o clicca per selezionare",
  description = "Supporta XML, P7M, CSV, ZIP (max 100MB)",
  ...dropzoneOptions
}) => {
  const onDrop = useCallback((acceptedFiles: File[], fileRejections: FileRejection[]) => {
    if (fileRejections.length > 0) {
      // Qui potresti notificare l'utente degli errori, per ora li logghiamo
      console.warn('File non accettati:', fileRejections);
    }
    if (acceptedFiles.length > 0) {
      onFilesAccepted(acceptedFiles);
    }
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    ...dropzoneOptions,
    onDrop,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-background p-8 text-center transition-colors duration-200 ease-in-out hover:border-primary/50",
          isDragActive && "border-primary bg-primary/10",
          className
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-4">
          <UploadCloud
            className={cn(
              "h-12 w-12 text-muted-foreground transition-transform duration-200 group-hover:scale-110",
              isDragActive && "text-primary"
            )}
          />
          <div>
            <p className="text-lg font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      {acceptedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">File selezionati:</h4>
          <ul className="space-y-2">
            {acceptedFiles.map((file, index) => (
              <li
                key={file.name + index}
                className="flex items-center justify-between rounded-md bg-muted/50 p-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <FileIcon className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
