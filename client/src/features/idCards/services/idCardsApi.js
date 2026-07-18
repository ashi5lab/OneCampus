import { downloadFile } from '../../../lib/apiClient';

export const idCardsApi = {
  downloadLearnerCard: (id, idNumber) => downloadFile(`/id-cards/learner/${id}/pdf`, `id-card-${idNumber}.pdf`),
  downloadInstructorCard: (id, idNumber) => downloadFile(`/id-cards/instructor/${id}/pdf`, `id-card-${idNumber}.pdf`),
  downloadStaffCard: (id, idNumber) => downloadFile(`/id-cards/staff/${id}/pdf`, `id-card-${idNumber}.pdf`)
};
