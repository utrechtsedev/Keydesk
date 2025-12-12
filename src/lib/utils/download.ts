import axios from 'axios';

export async function handleDownloadAttachment(ticketId: number, fileName: string) {
  const response = await axios.get(`/dashboard/tickets/${ticketId}/${fileName}`, {
    responseType: 'blob'
  });

  const blob = response.data;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
