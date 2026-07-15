import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../services/profileApi';

// `invalidateKey` is whichever profile query (learner's or instructor's)
// is currently showing the picture — the caller passes its own query key
// since this hook has no way to know which profile page it's used from.
export function useUploadProfilePicture(invalidateKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.uploadPicture,
    onSuccess: () => {
      if (invalidateKey) queryClient.invalidateQueries({ queryKey: invalidateKey });
    }
  });
}

export function useRemoveProfilePicture(invalidateKey) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.removePicture,
    onSuccess: () => {
      if (invalidateKey) queryClient.invalidateQueries({ queryKey: invalidateKey });
    }
  });
}
