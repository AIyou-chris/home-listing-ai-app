import React, { useState } from 'react';
import { fileUploadService, FileData } from '../services/fileUploadService';
import { auth } from '../services/firebase';

const FileUploadTest: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !auth.currentUser) return;

    setIsLoading(true);
    setMessage('');

    try {
      const file = event.target.files[0];
      
      // Upload file
      setMessage('Uploading file...');
      const uploadResult = await fileUploadService.uploadFile(
        file,
        auth.currentUser.uid
      );

      // Process document
      setMessage('Processing document...');
      await fileUploadService.processDocument(
        uploadResult.fileId,
        file.type
      );

      // Store in knowledge base
      setMessage('Storing in knowledge base...');
      await fileUploadService.storeKnowledgeBase(
        uploadResult.fileId,
        'test',
        ['test'],
        auth.currentUser.uid
      );

      setMessage('File uploaded and processed successfully!');
      
      // Refresh file list
      const result = await fileUploadService.getUserFiles(auth.currentUser.uid);
      setFiles(result.files);

    } catch (error) {
      console.error('Upload error:', error);
      setMessage(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadFiles = async () => {
    if (!auth.currentUser) return;

    try {
      const result = await fileUploadService.getUserFiles(auth.currentUser.uid);
      setFiles(result.files);
    } catch (error) {
      console.error('Load files error:', error);
      setMessage(`Error loading files: ${error}`);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Delete this file?')) return;

    try {
      await fileUploadService.deleteFile(fileId);
      await loadFiles();
      setMessage('File deleted successfully!');
    } catch (error) {
      console.error('Delete error:', error);
      setMessage(`Error deleting file: ${error}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">File Upload System Test</h1>
      
      {!auth.currentUser && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
          Please sign in to test file uploads
        </div>
      )}

      {auth.currentUser && (
        <>
          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <h2 className="text-lg font-semibold mb-4">Upload File</h2>
            <input
              type="file"
              onChange={handleFileUpload}
              disabled={isLoading}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {isLoading && (
              <div className="mt-2 text-sm text-gray-600">
                {message}
              </div>
            )}
          </div>

          <div className="bg-white p-6 rounded-lg shadow mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Uploaded Files</h2>
              <button
                onClick={loadFiles}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Refresh
              </button>
            </div>
            
            {files.length === 0 ? (
              <p className="text-gray-500">No files uploaded yet</p>
            ) : (
              <div className="space-y-2">
                {files.map((file) => (
                  <div key={file.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium">{file.fileName}</div>
                      <div className="text-sm text-gray-500">
                        {file.fileType} • {fileUploadService.formatFileSize(file.size)} • {file.status}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {message && (
        <div className={`p-4 rounded ${
          message.includes('Error') 
            ? 'bg-red-100 border border-red-400 text-red-700' 
            : 'bg-green-100 border border-green-400 text-green-700'
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default FileUploadTest;
