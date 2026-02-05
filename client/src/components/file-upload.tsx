import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image, Video, Music, File } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface UploadedFile {
  url: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
}

interface FileUploadProps {
  onFileUploaded: (file: UploadedFile) => void;
  acceptedTypes?: string;
  maxSize?: number;
  className?: string;
}

export default function FileUpload({ 
  onFileUploaded, 
  acceptedTypes = "image/*,video/*,audio/*",
  maxSize = 50 * 1024 * 1024, // 50MB
  className = ""
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (mimetype.startsWith('video/')) return <Video className="h-4 w-4" />;
    if (mimetype.startsWith('audio/')) return <Music className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFile = async (file: File) => {
    if (file.size > maxSize) {
      toast({
        title: "Fájl túl nagy",
        description: `A fájl mérete nem lehet nagyobb mint ${formatFileSize(maxSize)}`,
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 100);

      // Use fetch directly for FormData to avoid Content-Type issues
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Feltöltési hiba');
      }

      const result = await response.json();

      clearInterval(progressInterval);
      setUploadProgress(100);

      onFileUploaded(result);
      
      toast({
        title: "Sikeres feltöltés",
        description: `${file.name} sikeresen feltöltve`,
      });

    } catch (error: any) {
      toast({
        title: "Feltöltési hiba",
        description: error.message || "Hiba történt a fájl feltöltése során",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      uploadFile(files[0]);
    }
  };

  return (
    <div className={className}>
      <Card className={`border-2 border-dashed transition-colors ${
        isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
      } ${uploading ? 'pointer-events-none opacity-50' : ''}`}>
        <CardContent 
          className="p-6 text-center"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="space-y-4">
              <Upload className="h-8 w-8 mx-auto text-primary animate-pulse" />
              <p className="text-sm text-gray-600">Feltöltés folyamatban...</p>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-gray-500">{uploadProgress}%</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-8 w-8 mx-auto text-gray-400" />
              <div>
                <p className="text-sm font-medium">Húzd ide a fájlt vagy kattints a böngészéshez</p>
                <p className="text-xs text-gray-500 mt-1">
                  Támogatott formátumok: kép, videó, hang (max. {formatFileSize(maxSize)})
                </p>
              </div>
              <Input
                type="file"
                accept={acceptedTypes}
                onChange={handleFileSelect}
                className="cursor-pointer"
                disabled={uploading}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// URL input component for manual URL entry
interface UrlInputProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onUpload?: () => void;
}

export function UrlInput({ label, placeholder, value, onChange, onUpload }: UrlInputProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1"
        />
        {onUpload && (
          <Button
            type="button"
            variant="outline"
            onClick={onUpload}
            className="px-3"
          >
            <Upload className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Multiple file display component
interface FileListProps {
  files: UploadedFile[];
  onRemove: (filename: string) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Feltöltött fájlok</Label>
      <div className="space-y-2">
        {files.map((file, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* {getFileIcon(file.mimetype)} */}
                <div>
                  <p className="text-sm font-medium">{file.originalName}</p>
                  <p className="text-xs text-gray-500">
                    {/* {formatFileSize(file.size)} */} • {file.mimetype}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(file.filename)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}