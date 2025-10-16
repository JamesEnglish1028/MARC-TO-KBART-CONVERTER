export interface KbartRow {
  publication_title: string;
  print_identifier: string;
  online_identifier: string;
  publisher_name: string;
  publication_date: string;
  title_url: string;
}

export interface Status {
  message: string;
  type: 'info' | 'error' | 'success';
}
