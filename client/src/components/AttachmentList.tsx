// src/components/AttachmentList.tsx
import React, { useState } from 'react';
import { downloadFile } from '../utils/downloadUtils';
import { getFileType, getFileConfig, formatFileSize, isImageFile } from '../utils/fileUtils';
import FileIcon from './FileIcon';
import ImageViewer from './ImageViewer';

interface AttachmentInfo {
  url: string;
  originalName: string;
  storedName: string;
  size?: number;
  mimeType?: string;
}

interface AttachmentListProps {
  attachments: AttachmentInfo[];
}

const AttachmentList: React.FC<AttachmentListProps> = ({ attachments }) => {
  const [imageViewer, setImageViewer] = useState<{
    isOpen: boolean;
    imageUrl: string;
    altText: string;
  }>({
    isOpen: false,
    imageUrl: '',
    altText: ''
  });

  const handleDownload = async (fileInfo: AttachmentInfo) => {
    await downloadFile({
      storedName: fileInfo.storedName,
      originalName: fileInfo.originalName,
      url: fileInfo.url
    });
  };

  const handleImageClick = (fileInfo: AttachmentInfo) => {
    if (isImageFile(fileInfo.originalName)) {
      setImageViewer({
        isOpen: true,
        imageUrl: fileInfo.url || `/api/files/${fileInfo.storedName}`,
        altText: fileInfo.originalName
      });
    }
  };

  const closeImageViewer = () => {
    setImageViewer({
      isOpen: false,
      imageUrl: '',
      altText: ''
    });
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <>
      <section className="px-8 py-6 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3 mb-4">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
          <h3 className="font-medium text-gray-900">
            첨부파일 ({attachments.length}개)
          </h3>
        </div>
        
        <div className="space-y-3">
          {attachments.map((fileInfo, index) => {
            const displayName = fileInfo.originalName || `파일_${index + 1}`;
            const fileType = getFileType(displayName);
            const fileConfig = getFileConfig(fileType);
            const isImage = isImageFile(displayName);
            
            return (
              <div 
                key={index} 
                className={`flex items-center gap-4 p-4 bg-white rounded-xl hover:bg-gray-50 transition-colors group ${
                  isImage ? 'cursor-pointer' : 'cursor-default'
                }`}
                onClick={() => isImage && handleImageClick(fileInfo)}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${fileConfig.color}`}>
                  <FileIcon fileType={fileType} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate" title={displayName}>
                    {displayName}
                    {isImage && (
                      <span className="ml-2 text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                        클릭하여 확대
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 capitalize">
                    {fileType} 파일
                    {fileInfo.size && ` • ${formatFileSize(fileInfo.size)}`}
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(fileInfo);
                  }}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium border-0 outline-none focus:outline-none"
                  aria-label={`${displayName} 다운로드`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  다운로드
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 이미지 뷰어 */}
      <ImageViewer
        isOpen={imageViewer.isOpen}
        onClose={closeImageViewer}
        imageUrl={imageViewer.imageUrl}
        altText={imageViewer.altText}
      />
    </>
  );
};

export default AttachmentList;