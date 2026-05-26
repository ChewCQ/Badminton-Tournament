export async function uploadFileAsBase64(file: File): Promise<{ success: boolean; url?: string; error?: string }> {
  return new Promise((resolve) => {
    // Basic validation to prevent extremely large files
    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      resolve({ success: false, error: "File must be less than 5MB." });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({ success: true, url: e.target?.result as string });
    };
    reader.onerror = () => {
      resolve({ success: false, error: "Failed to read file." });
    };
    reader.readAsDataURL(file);
  });
}
