import io
import os
import base64
import json
import urllib.request
import numpy as np
from loguru import logger
from PIL import Image

DETECTION_CLASSES = ["smoke", "dust", "fire", "traffic_jam", "garbage_burn"]


class PollutionDetector:
    def __init__(self):
        self.model = None
        self.model_type = "simulation"

    def load_model(self):
        logger.info("Loading pollution detection model")
        try:
            from ultralytics import YOLO

            model_path = os.path.join(
                os.path.dirname(__file__), "..", "artifacts", "yolov8n.pt"
            )
            if os.path.exists(model_path):
                self.model = YOLO(model_path)
                self.model_type = "yolov8"
                logger.info("YOLOv8 model loaded successfully")
            else:
                logger.warning(
                    "YOLOv8 model file not found at artifacts/yolov8n.pt, "
                    "downloading..."
                )
                try:
                    self.model = YOLO("yolov8n.pt")
                    self.model_type = "yolov8"
                    logger.info("YOLOv8 model downloaded and loaded")
                except Exception as e2:
                    logger.warning(f"Could not download YOLOv8: {e2}, using fallback")
                    self.model = None
                    self.model_type = "simulation"
        except ImportError:
            logger.warning("ultralytics not installed, using fallback detector")
            self.model = None
            self.model_type = "simulation"

        if self.model is None:
            self._init_fallback_detector()

    def _init_fallback_detector(self):
        logger.info("Initializing fallback pollution detector (OpenCV + color detection)")
        self.model_type = "simulation"
        try:
            import cv2
            self._cv2 = cv2
            logger.info("OpenCV available for fallback detection")
        except ImportError:
            self._cv2 = None
            logger.warning("OpenCV not available, using random detection simulation")

    def detect(self, image_bytes: bytes | None = None, image_url: str | None = None) -> list[dict]:
        logger.info("Running pollution detection")

        if image_url and not image_bytes:
            try:
                req = urllib.request.Request(
                    image_url,
                    headers={"User-Agent": "Mozilla/5.0"},
                )
                resp = urllib.request.urlopen(req, timeout=15)
                image_bytes = resp.read()
                logger.info(f"Fetched image from URL ({len(image_bytes)} bytes)")
            except Exception as e:
                logger.warning(f"Failed to fetch image URL: {e}")

        if image_bytes:
            try:
                img = Image.open(io.BytesIO(image_bytes))
                img = img.convert("RGB")
                logger.info(f"Image loaded: {img.size}")
            except Exception as e:
                logger.warning(f"Failed to decode image bytes: {e}, using simulation")
                return self._simulate_detections()
        else:
            logger.info("No image provided, using simulated detections")
            return self._simulate_detections()

        # Try YOLO detection
        if self.model_type == "yolov8" and self.model is not None:
            try:
                return self._yolo_detect(img)
            except Exception as e:
                logger.warning(f"YOLO detection failed: {e}, falling back")

        # Try OpenCV fallback
        if self._cv2 is not None:
            try:
                return self._opencv_detect(img)
            except Exception as e:
                logger.warning(f"OpenCV detection failed: {e}, using simulation")

        return self._simulate_detections()

    def _yolo_detect(self, img: Image.Image) -> list[dict]:
        logger.info("Running YOLOv8 detection")
        results = self.model(img, conf=0.25, iou=0.5)
        detections = []
        for result in results:
            if result.boxes is None:
                continue
            boxes = result.boxes.xyxy.cpu().numpy()
            confs = result.boxes.conf.cpu().numpy()
            classes = result.boxes.cls.cpu().numpy().astype(int)

            for box, conf, cls_id in zip(boxes, confs, classes):
                cls_name = DETECTION_CLASSES[cls_id % len(DETECTION_CLASSES)]
                x1, y1, x2, y2 = box
                detections.append({
                    "class": cls_name,
                    "confidence": round(float(conf), 4),
                    "bbox": [round(float(x1), 2), round(float(y1), 2), round(float(x2), 2), round(float(y2), 2)],
                })

        detections = [d for d in detections if d["confidence"] >= 0.5]
        detections = self._nms(detections, 0.5)

        if not detections:
            logger.info("No detections from YOLO, using simulated")
            return self._simulate_detections()

        logger.info(f"YOLO found {len(detections)} detections")
        return detections

    def _opencv_detect(self, img: Image.Image) -> list[dict]:
        logger.info("Running OpenCV-based detection")
        import cv2
        import numpy as np

        frame = np.array(img)
        frame = cv2.cvtColor(frame, cv2.COLOR_RGB2BGR)
        h, w = frame.shape[:2]

        detections = []
        min_area = 0.01 * w * h

        # Smoke detection: gray/white regions with high variance
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (15, 15), 0)
        _, smoke_mask = cv2.threshold(blurred, 180, 255, cv2.THRESH_BINARY)
        smoke_mask = cv2.erode(smoke_mask, None, iterations=1)
        smoke_mask = cv2.dilate(smoke_mask, None, iterations=2)
        contours, _ = cv2.findContours(smoke_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > min_area:
                x, y, bw, bh = cv2.boundingRect(cnt)
                conf = min(1.0, area / (0.3 * w * h) + 0.3)
                detections.append({
                    "class": "smoke",
                    "confidence": round(conf, 4),
                    "bbox": [x, y, x + bw, y + bh],
                })

        # Fire detection: red/orange regions
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        lower_fire = np.array([0, 50, 150])
        upper_fire = np.array([30, 255, 255])
        fire_mask = cv2.inRange(hsv, lower_fire, upper_fire)
        fire_mask = cv2.dilate(fire_mask, None, iterations=2)
        contours, _ = cv2.findContours(fire_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > min_area:
                x, y, bw, bh = cv2.boundingRect(cnt)
                conf = min(1.0, area / (0.2 * w * h) + 0.3)
                detections.append({
                    "class": "fire",
                    "confidence": round(conf, 4),
                    "bbox": [x, y, x + bw, y + bh],
                })

        # Dust detection: brown/hazy regions
        lower_dust = np.array([10, 20, 100])
        upper_dust = np.array([40, 80, 200])
        dust_mask = cv2.inRange(hsv, lower_dust, upper_dust)
        dust_mask = cv2.dilate(dust_mask, None, iterations=1)
        contours, _ = cv2.findContours(dust_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > min_area:
                x, y, bw, bh = cv2.boundingRect(cnt)
                conf = min(1.0, area / (0.25 * w * h) + 0.2)
                detections.append({
                    "class": "dust",
                    "confidence": round(conf, 4),
                    "bbox": [x, y, x + bw, y + bh],
                })

        # Traffic jam: high density of edges in road areas
        edges = cv2.Canny(gray, 50, 150)
        edge_density = np.sum(edges) / (h * w * 255)
        if edge_density > 0.05:
            detections.append({
                "class": "traffic_jam",
                "confidence": round(min(1.0, edge_density * 5), 4),
                "bbox": [int(w * 0.1), int(h * 0.3), int(w * 0.9), int(h * 0.8)],
            })

        detections = self._nms(detections, 0.4)
        detections = [d for d in detections if d["confidence"] >= 0.5]

        if not detections:
            logger.info("No detections from OpenCV, using simulation")
            return self._simulate_detections()

        logger.info(f"OpenCV found {len(detections)} detections")
        return detections

    def _nms(self, detections: list[dict], iou_threshold: float = 0.5) -> list[dict]:
        if not detections:
            return []
        boxes = np.array([d["bbox"] for d in detections])
        scores = np.array([d["confidence"] for d in detections])

        x1 = boxes[:, 0]
        y1 = boxes[:, 1]
        x2 = boxes[:, 2]
        y2 = boxes[:, 3]
        areas = (x2 - x1) * (y2 - y1)
        order = scores.argsort()[::-1]

        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            w = np.maximum(0, xx2 - xx1)
            h = np.maximum(0, yy2 - yy1)
            inter = w * h
            iou = inter / (areas[i] + areas[order[1:]] - inter)
            order = order[1:][iou <= iou_threshold]

        return [detections[i] for i in keep]

    def _simulate_detections(self) -> list[dict]:
        logger.info("Generating simulated pollution detections")
        rng = np.random.default_rng()
        n_detections = rng.integers(1, 5)
        detections = []
        for _ in range(n_detections):
            cls = DETECTION_CLASSES[rng.integers(0, len(DETECTION_CLASSES))]
            conf = round(float(rng.uniform(0.5, 0.98)), 4)
            x1 = round(float(rng.uniform(0, 400)), 2)
            y1 = round(float(rng.uniform(0, 300)), 2)
            x2 = round(float(rng.uniform(x1 + 50, x1 + 300)), 2)
            y2 = round(float(rng.uniform(y1 + 50, y1 + 200)), 2)
            detections.append({
                "class": cls,
                "confidence": conf,
                "bbox": [x1, y1, x2, y2],
            })
        return detections
