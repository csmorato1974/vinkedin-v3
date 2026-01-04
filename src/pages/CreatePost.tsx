import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { CreatePostModal } from '@/components/posts/CreatePostModal';

export default function CreatePost() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    setIsOpen(true);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    navigate(-1);
  };

  const handleSuccess = () => {
    navigate('/');
  };

  return (
    <MainLayout>
      <CreatePostModal
        isOpen={isOpen}
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    </MainLayout>
  );
}
