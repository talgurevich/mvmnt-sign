import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Paper
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DeleteIcon from '@mui/icons-material/Delete';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';

const FileUploadDropzone = ({ onFileUpload, uploading, imports = [], onDeleteImport }) => {
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles[0]);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: false,
    disabled: uploading
  });

  return (
    <Box>
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          bgcolor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease',
          '&:hover': {
            borderColor: 'primary.main',
            bgcolor: 'action.hover'
          }
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Box display="flex" flexDirection="column" alignItems="center">
            <CircularProgress size={40} sx={{ mb: 2 }} />
            <Typography>מעלה ומעבד את הקובץ...</Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" alignItems="center">
            <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'שחרר כדי להעלות' : 'גרור קובץ Excel לכאן'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              או לחץ לבחירת קובץ (.xlsx, .xls)
            </Typography>
          </Box>
        )}
      </Box>

      {imports.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            קבצים שהועלו ({imports.length})
          </Typography>
          <Paper variant="outlined">
            <List dense>
              {imports.map((imp) => (
                <ListItem key={imp.id} divider>
                  <InsertDriveFileIcon sx={{ mr: 2, color: 'success.main' }} />
                  <ListItemText
                    primary={imp.file_name}
                    secondary={
                      <Box component="span" sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                        <Chip
                          size="small"
                          label={`${imp.total_transactions} תנועות`}
                          variant="outlined"
                        />
                        {imp.date_range_start && imp.date_range_end && (
                          <Chip
                            size="small"
                            label={`${new Date(imp.date_range_start).toLocaleDateString('he-IL')} - ${new Date(imp.date_range_end).toLocaleDateString('he-IL')}`}
                            variant="outlined"
                          />
                        )}
                        <Chip
                          size="small"
                          label={new Date(imp.created_at).toLocaleDateString('he-IL')}
                          variant="outlined"
                          color="default"
                        />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => onDeleteImport(imp.id)}
                      size="small"
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default FileUploadDropzone;
