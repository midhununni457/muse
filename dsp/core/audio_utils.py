from .peak import extract_peaks
from .fingerprint import fingerprint

def process_audio():
    extract_peaks()
    fingerprint()
    return []