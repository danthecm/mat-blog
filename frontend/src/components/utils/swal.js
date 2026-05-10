import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export const confirmModal = async (title, text, confirmButtonText = 'Yes, proceed') => {
  return MySwal.fire({
    title: title,
    text: text,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#00aaa1', // Primary color
    cancelButtonColor: '#ff4d4d',
    confirmButtonText: confirmButtonText,
    cancelButtonText: 'Cancel',
    background: '#ffffff',
    color: '#1e1e1e',
    customClass: {
      popup: 'rounded-2xl border-none shadow-2xl',
      title: 'font-poppins font-bold text-2xl',
      htmlContainer: 'font-outfit text-gray-600',
      confirmButton: 'rounded-lg px-6 py-2 font-bold uppercase tracking-wider',
      cancelButton: 'rounded-lg px-6 py-2 font-bold uppercase tracking-wider'
    }
  });
};

export const promptModal = async (title, inputLabel, placeholder = '') => {
  return MySwal.fire({
    title: title,
    input: 'textarea',
    inputLabel: inputLabel,
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonColor: '#00aaa1',
    cancelButtonColor: '#ff4d4d',
    confirmButtonText: 'Submit',
    background: '#ffffff',
    color: '#1e1e1e',
    customClass: {
      popup: 'rounded-2xl border-none shadow-2xl',
      title: 'font-poppins font-bold text-xl',
      input: 'rounded-lg border-gray-200 focus:border-primary focus:ring-primary',
      confirmButton: 'rounded-lg px-6 py-2 font-bold uppercase tracking-wider',
      cancelButton: 'rounded-lg px-6 py-2 font-bold uppercase tracking-wider'
    }
  });
};

export const infoModal = async (title, text, icon = 'info') => {
  return MySwal.fire({
    title: title,
    text: text,
    icon: icon,
    confirmButtonColor: '#00aaa1',
    background: '#ffffff',
    color: '#1e1e1e',
    customClass: {
      popup: 'rounded-2xl border-none shadow-2xl',
      title: 'font-poppins font-bold text-xl',
      htmlContainer: 'font-outfit text-gray-600',
      confirmButton: 'rounded-lg px-6 py-2 font-bold uppercase tracking-wider'
    }
  });
};

// ─── Toast Configuration ───────────────────────────────────────────────────────
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

export const toast = {
  success: (message) => {
    Toast.fire({
      icon: 'success',
      title: message,
      background: '#ffffff',
      color: '#1e1e1e',
    });
  },
  error: (message) => {
    Toast.fire({
      icon: 'error',
      title: message,
      background: '#ffffff',
      color: '#1e1e1e',
    });
  },
  info: (message) => {
    Toast.fire({
      icon: 'info',
      title: message,
      background: '#ffffff',
      color: '#1e1e1e',
    });
  }
};

export default MySwal;
