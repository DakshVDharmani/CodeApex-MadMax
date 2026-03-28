"""
Audio Service using Whisper for speech-to-text conversion
"""

import os
import tempfile
import subprocess
from typing import Optional
import whisper

class AudioService:
    def __init__(self):
        """Initialize Whisper model"""
        try:
            # Load base model for faster processing
            self.model = whisper.load_model("base")
            print("✅ Whisper model loaded successfully")
        except Exception as e:
            print(f"❌ Failed to load Whisper model: {e}")
            self.model = None
    
    def extract_audio_from_video(self, video_path: str, output_audio_path: Optional[str] = None) -> Optional[str]:
        """
        Extract audio from video file using ffmpeg
        
        Args:
            video_path: Path to the video file
            output_audio_path: Optional path for output audio file
            
        Returns:
            Path to the extracted audio file or None if failed
        """
        try:
            if output_audio_path is None:
                # Create temporary audio file
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                    output_audio_path = temp_audio.name
            
            # Use ffmpeg to extract audio
            cmd = [
                "ffmpeg", "-i", video_path,
                "-vn",  # No video
                "-acodec", "pcm_s16le",  # Audio codec
                "-ar", "16000",  # Sample rate
                "-ac", "1",  # Mono
                "-y",  # Overwrite output file
                output_audio_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            if result.returncode == 0:
                print(f"🎵 Audio extracted successfully: {output_audio_path}")
                return output_audio_path
            else:
                print(f"❌ Failed to extract audio: {result.stderr}")
                return None
                
        except Exception as e:
            print(f"❌ Error extracting audio from video: {e}")
            return None
    
    def transcribe_audio(self, audio_path: str) -> str:
        """
        Transcribe audio to text using Whisper
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            Transcribed text as a string
        """
        if not self.model:
            print("❌ Whisper model not available")
            return ""
        
        try:
            # Transcribe audio
            result = self.model.transcribe(
                audio_path,
                fp16=False,  # Use FP32 for compatibility
                language='en',  # Specify English
                task='transcribe'
            )
            
            transcribed_text = result.get('text', '').strip()
            print(f"🎤 Audio transcribed: {len(transcribed_text)} characters")
            return transcribed_text
            
        except Exception as e:
            print(f"❌ Error transcribing audio: {e}")
            return ""
    
    def process_video_audio(self, video_path: str) -> str:
        """
        Complete pipeline: extract audio from video and transcribe to text
        
        Args:
            video_path: Path to the video file
            
        Returns:
            Transcribed text as a string
        """
        try:
            # Extract audio
            audio_path = self.extract_audio_from_video(video_path)
            if not audio_path:
                return ""
            
            # Transcribe audio
            transcribed_text = self.transcribe_audio(audio_path)
            
            # Clean up temporary audio file
            try:
                os.unlink(audio_path)
            except:
                pass
            
            return transcribed_text
            
        except Exception as e:
            print(f"❌ Error processing video audio: {e}")
            return ""
    
    def cleanup_temp_files(self):
        """Clean up temporary files"""
        try:
            import shutil
            temp_dir = tempfile.gettempdir()
            # Clean up any temporary audio files
            for file in os.listdir(temp_dir):
                if file.endswith('.wav') or file.endswith('.mp3'):
                    try:
                        os.unlink(os.path.join(temp_dir, file))
                    except:
                        pass
        except Exception as e:
            print(f"⚠️ Error cleaning up temp audio files: {e}")

# Singleton instance
audio_service = AudioService()

def extract_audio_from_video(video_path: str, output_audio_path: Optional[str] = None) -> Optional[str]:
    """Convenience function to extract audio from video"""
    return audio_service.extract_audio_from_video(video_path, output_audio_path)

def transcribe_audio(audio_path: str) -> str:
    """Convenience function to transcribe audio to text"""
    return audio_service.transcribe_audio(audio_path)

def process_video_audio(video_path: str) -> str:
    """Convenience function to process video audio completely"""
    return audio_service.process_video_audio(video_path)
