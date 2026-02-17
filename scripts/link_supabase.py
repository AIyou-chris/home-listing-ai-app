import subprocess
import time
import sys

def link_supabase():
    print("Starting automated Supabase linking...")
    process = subprocess.Popen(
        ['supabase', 'link', '--project-ref', 'yocchddxdsaldgsibmmc'],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )

    try:
        # Give it a moment to start and prompt
        time.sleep(2)
        
        # Send password
        print("Sending password...")
        process.stdin.write('Jake@2024\n')
        process.stdin.flush()
        
        # Read output
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(output.strip())
                
        stderr_output = process.stderr.read()
        if stderr_output:
            print(f"STDERR: {stderr_output}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        process.terminate()

if __name__ == "__main__":
    link_supabase()
