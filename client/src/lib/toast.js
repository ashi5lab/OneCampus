import toast from 'react-hot-toast';

const baseStyle = {
  borderRadius: '10px',
  padding: '16px 24px',
  fontSize: '16px',
  fontWeight: '500',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
};

export const showToast = {
  success: (message) => toast.success(message, {
    style: {
      ...baseStyle,
      background: '#10B981', // Bright emerald
      color: '#FFFFFF',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#10B981',
    },
  }),
  error: (message) => toast.error(message, {
    style: {
      ...baseStyle,
      background: '#EF4444', // Bright red
      color: '#FFFFFF',
    },
    iconTheme: {
      primary: '#fff',
      secondary: '#EF4444',
    },
  }),
  info: (message) => toast(message, {
    icon: 'ℹ️',
    style: {
      ...baseStyle,
      background: '#3B82F6', // Bright blue
      color: '#FFFFFF',
    },
  }),
  // For standard loading patterns if needed
  loading: (message) => toast.loading(message, {
    style: {
      ...baseStyle,
      background: '#FFFFFF',
      color: '#333333',
    }
  })
};
