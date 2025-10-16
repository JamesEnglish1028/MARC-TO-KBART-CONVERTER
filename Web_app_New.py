@app.route('/api/convert', methods=['POST'])
def api_convert():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    try:
        reader = MARCReader(file)
        records = [rec.as_dict() for rec in reader]
        return jsonify(records)
    except PymarcException as e:
        return jsonify({'error': f'Error processing MARC file: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500
from flask import Flask, request, render_template_string, send_file, jsonify
import csv
import unicodedata
import re
import requests
from pymarc import MARCReader, PymarcException
from openpyxl import Workbook
import tempfile
import os

app = Flask(__name__)

# --------------------- HTML FORM TEMPLATE --------------------- #

HTML_FORM = """
<!DOCTYPE html>
<html>
<head>
    <title>Palace MARC File to Inventory Spreadsheet Converter</title>
    <style>

        h1  {
            font-family: open-sans, san-serif;
            color: grey
        }
        /* Basic styling for layout */
        body {
            font-family: open-sans, sans-serif;
            padding: 20px;
        }

        .form-container {
            display: flex;
            justify-content: space-between;
            height: 500px; /* Adjust as needed */
        }

        /* Form side */
        .form-side {
            flex: 1;
            margin-right: 20px;
        }

        /* Iframe side */
        .iframe-side {
            flex: 1;
            border: 1px solid #ddd;
            padding: 10px;
            height: 100%;
        }

        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        /* Styling for buttons */
        .button-container {
            margin-top: 10px;
        }

        input[type="button"] {
            margin-left: 10px;
            padding: 10px 15px;
            font-size: 14px;
            cursor: pointer;
            background-color: #f44336;
            color: white;
            border: 1px solid #ddd;
            border-radius: 5px;
        }

        input[type="button"]:hover {
            background-color: #e53935;
        }

        input[type="submit"] {
            padding: 10px 15px;
            font-size: 14px;
            cursor: pointer;
            background-color: #4CAF50;
            color: white;
            border: none;
            border-radius: 5px;
        }

        input[type="submit"]:hover {
            background-color: #45a049;
        }
    </style>
</head>
<body>
    <div style="text-align: left;">
        <img src="{{ url_for('static', filename='logo.png') }}" alt="Your Logo" style="max-width: 400px; margin-bottom: 20px;">
    </div>
    <h2>MARC to Spreadsheet Converter</h2>
       <div> To use this program enter the Palace Manager MARC endpoint URL.  This will allow you to easily copy the MARC File for the collection you want to convert into an Inventory file.</div>

    <!-- Flexbox container with two sections: form on the left, iframe on the right -->
    <div class="form-container">

        <!-- Form Side -->
        <div class="form-side">
         <h3>Input Form</h3>
            <form method="POST">
                <!-- Input for URL to display in the iframe -->
                <label for="iframe_url">Enter URL for Palace Mamager MARC Endpoint:</label><br>
                <input type="text" name="iframe_url" id="iframe_url" size="80"><br><br>
                
                <!-- Clear button for iFrame URL -->
                <input type="button" value="Clear Palace Manager MARC Endpoint URL" id="clear-iframe-url"><br><br>

                <label for="marc_url">Copy and Paste MARC File URL here:</label><br>
                <input type="text" name="marc_url" id="marc_url" size="80" required><br><br>
                
                <!-- Clear button for MARC URL -->
                <input type="button" value="Clear MARC URL" id="clear-marc-url"><br><br>
                
                <!-- URL display div -->
                <div id="url-display" class="url-display"></div><br><br>
                
                <label for="format">Select File Format:</label><br>
                <select name="format">
                    <option value="xlsx">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                    <option value="tsv">KBART (.tsv)</option>
                </select><br><br>

                <input type="submit" value="Convert and Download">

                <!-- Clear button to reset the URL input field -->
                <input type="button" value="Clear URL" id="clear-url">
            </form>
        </div>

        <!-- iFrame Side -->
        <div class="iframe-side">
            <h3> Palace Manager MARC Endpoint</h3>
            <iframe id="iframe" src="" frameborder="0"></iframe>
        </div>
    </div>

    <script>
        // JavaScript to dynamically display the MARC URL and update iframe source
        document.getElementById('marc_url').addEventListener('input', function() {
            var url = this.value;
            document.getElementById('url-display').textContent = url;
        });

        // JavaScript to clear the MARC URL input field when the Clear MARC URL button is clicked
        document.getElementById('clear-marc-url').addEventListener('click', function() {
            document.getElementById('marc_url').value = '';  // Clear the MARC URL input field
            document.getElementById('url-display').textContent = '';  // Clear the displayed MARC URL
        });

        // JavaScript to clear the iFrame URL input field when the Clear iFrame URL button is clicked
        document.getElementById('clear-iframe-url').addEventListener('click', function() {
            document.getElementById('iframe_url').value = '';  // Clear the iframe URL input field
            document.getElementById('iframe').src = '';  // Reset iframe
        });

        // JavaScript to update iframe source based on input URL
        document.getElementById('iframe_url').addEventListener('input', function() {
            var iframeUrl = this.value;
            document.getElementById('iframe').src = iframeUrl;  // Update iframe src
        });
    </script>
</body>
</html>
"""

# --------------------- MARC Utilities --------------------- #

def get_subfield(field, code):
    return field.get_subfields(code)[0] if field and field.get_subfields(code) else None

def clean_unicode(text):
    if not text:
        return ""
    text = unicodedata.normalize("NFC", text)
    text = text.strip()
    text = re.sub(r'[\r\n\t]+', ' ', text)
    text = ''.join(ch for ch in text if ch.isprintable())
    return text

#<------------------ publication type ------------------->

def get_publication_type(record):
    bib_level = record.leader[7]
    if bib_level == 's':
        return "serial"
    elif bib_level == 'm':
        return "monograph"
    else:
        return "other"

#<------------------- publication access type --------------->

def get_access_type(record):
    # Check field 506 for access notes
    for field in record.get_fields('506'):
        restriction_note = " ".join(field.get_subfields('a')).lower()
        if any(term in restriction_note for term in ['unrestricted', 'open', 'no restrictions']):
            return "openaccess"
    
    # Fallback: infer from field 856
    for field in record.get_fields('856'):
        if field.indicator2 == '0':
            return "openaccess"
        if 'z' in field and 'subscription' in " ".join(field.get_subfields('z')).lower():
            return "paid"
    
    return "paid"  # Default to 'paid' if no information found

#<------------------- publisher information ----------->
def get_pub_info(record):
    publisher_name = date_monograph_published_online = ""
    for field in record.get_fields('264'):
        if field.indicator2 == '1':
            publisher_name = get_subfield(field, 'b') or ""
            date_monograph_published_online = get_subfield(field, 'c') or ""
            return publisher_name.strip(), date_monograph_published_online.strip()

    fields_260 = record.get_fields('260')
    if fields_260:
        publisher_name = get_subfield(fields_260[0], 'b') or ""
        date_monograph_published_online = get_subfield(fields_260[0], 'c') or ""

    return publisher_name.strip(), date_monograph_published_online.strip()

#<-------------------Publication (title) information---------->
def marc_to_row(record):
    title_id = clean_unicode(record['001'].value()) if '001' in record else "unknown"
    publication_title = clean_unicode(f"{get_subfield(record['245'], 'a') or ''} {get_subfield(record['245'], 'b') or ''}".strip())

    first_author = ""
    for tag in ('100', '110', '111'):
        for field in record.get_fields(tag):
            name = get_subfield(field, 'a')
            if name:
                first_author = clean_unicode(name)
                break
            if first_author:
                break

    first_editor = next(
    (clean_unicode(get_subfield(f, 'a')) for f in record.get_fields('700') if 'e' in f and 'editor' in " ".join(f.get_subfields('e')).lower()),
    ""
)
    online_identifier = [
        clean_unicode(get_subfield(f, 'a'))
        for f in record.get_fields('020') if get_subfield(f, 'a')
]
    online_identifier = "; ".join(online_identifier)

#<---------clean the publisher info ------->
    publisher_name, date_monograph_published_online = get_pub_info(record)
    publisher_name = clean_unicode(publisher_name)
    date_monograph_published_online = clean_unicode(date_monograph_published_online)

    title_url = "N/A"
    for field in record.get_fields('856'):
        url = get_subfield(field, 'u')
        if url:
            title_url = clean_unicode(url)
            break

    publication_type = get_publication_type(record)
    access_type = get_access_type(record)

    return {
        "title_id": title_id,
        "publication_title": publication_title,
        "title_url": title_url,
        "first_author": first_author,
        "online_identifier": online_identifier, 
        "publisher_name": publisher_name, 
        "publication_type": publication_type, 
        "date_monograph_published_online": date_monograph_published_online, 
        "first_editor": first_editor, 
        "access_type": access_type
    }

    # KBART Phase II headers for monographs
def generate_output_file(records, fmt): 
    headers = [
        "publication_title", #title from MARC 245
        "print_identifier", #NA
        "online_identifier", #eISBN from MARC field 020
        "date_first_issue_online", #NA thisis for journal
        "num_first_vol_online", #NA
        "num_first_issue_online", #NA
        "date_last_issue_online", #NA
        "num_last_vol_online", #NA
        "num_last_issue_online", #NA
        "title_url", #Palace url from MARC 856
        "first_author", 
        "title_id", #Palace uuid from marc
        "embargo_info",
        "coverage_depth",
        "notes", #NA
        "publisher_name", #publisher from MARC 260/264
        "publication_type",
        "date_monograph_published_print", #NA
        "date_monograph_published_online", #publication date from MARC
        "monograph_volume",
        "monograph_edition",
        "first_editor",
        "parent_publication_title_id",
        "preceding_publication_title_id",
        "access_type"
    ]

    # Example: write to CSV/TSV based on format
    delimiter = "\t" if fmt == "tsv" else ","
    
    with open(f"output.{fmt}", "w", encoding="utf-8") as f:
        f.write(delimiter.join(headers) + "\n")
        for record in records:
            row = [
                record.get("publication_title", ""),
                record.get("print_identifier", ""),
                record.get("online_identifier", ""),
                record.get("date_first_issue_online", ""),
                record.get("num_first_vol_online", ""),
                record.get("num_first_issue_online", ""),
                record.get("date_last_issue_online", ""),
                record.get("num_last_vol_online", ""),
                record.get("num_last_issue_online", ""),
                record.get("title_url", ""),
                record.get("first_author", ""),
                record.get("title_id", ""),
                record.get("embargo_info", ""),
                record.get("coverage_depth", "fulltext"),
                record.get("notes", ""),
                record.get("publisher_name", ""),
                record.get("publication_type", "monograph"),
                record.get("date_monograph_published_print", ""),
                record.get("date_monograph_published_online", ""),
                record.get("monograph_volume", ""),
                record.get("monograph_edition", ""),
                record.get("first_editor", ""),
                record.get("parent_publication_title_id", ""),
                record.get("preceding_publication_title_id", ""),
                record.get("access_type", "paid")
            ]
            f.write(delimiter.join(row) + "\n")

# <----------old headers minimalist   ---------->
# def generate_output_file(records, fmt):
#    headers = ["Record ID", "Title", "Author(s)", "ISBN(s)", "Publisher", "Publication Date", "Resource Link"]

        tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{fmt}")
        tmp.close()

        if fmt == 'xlsx':
            wb = Workbook()
            ws = wb.active
            ws.append(headers)
            for row in records:
                ws.append([row.get(h,"") for h in headers])
            wb.save(tmp.name)
        else:
            delimiter = ',' if fmt == 'csv' else '\t'
            with open(tmp.name, mode='w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=headers, delimiter=delimiter, extrasaction='ignore')
                writer.writeheader()
                writer.writerows(records)

        return tmp.name

# --------------------- Error Handling --------------------- #

@app.errorhandler(404)
def page_not_found(error):
    return jsonify(error="Page not found"), 404

@app.errorhandler(500)
def internal_server_error(error):
    return jsonify(error="Internal server error, please try again later"), 500

# --------------------- Flask Routes --------------------- #

@app.route('/', methods=['GET', 'POST'])
def index():
    if request.method == 'POST':
        marc_url = request.form['marc_url']
        fmt = request.form['format']

        # Validate MARC URL
        if not marc_url.startswith('http'):
            return "<h3>Invalid URL format. Please provide a valid URL for the MARC file.</h3>"

        try:
            r = requests.get(marc_url)
            r.raise_for_status()
        except requests.exceptions.RequestException as e:
            return f"<h3>Error fetching MARC file: {e}</h3>"

        # Process MARC file
        try:
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mrc") as f:
                f.write(r.content)
                temp_path = f.name

            with open(temp_path, 'rb') as fh:
                reader = MARCReader(fh)
                data = [marc_to_row(rec) for rec in reader]

        except PymarcException as e:
            return f"<h3>Error processing MARC file: {e}</h3>"
        except Exception as e:
            return f"<h3>An unexpected error occurred: {e}</h3>"
        finally:
            # Cleanup temp file after processing
            if os.path.exists(temp_path):
                os.remove(temp_path)

        # Generate and send output file
        try:
            output_path = generate_output_file(data, fmt)
            return send_file(output_path, as_attachment=True)
        except Exception as e:
            return f"<h3>Error generating output file: {e}</h3>"

    return render_template_string(HTML_FORM)

# --------------------- Run the Web App --------------------- #

if __name__ == '__main__':
    app.run(debug=True)
