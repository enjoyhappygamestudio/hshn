import { runBackup } from '../services/backup';

runBackup()
  .then((result) => {
    console.log('Backup hoàn tất:', result);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Backup thất bại:', err);
    process.exit(1);
  });
