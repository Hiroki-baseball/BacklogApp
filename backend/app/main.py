from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import requests
from dotenv import load_dotenv
from typing import List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

load_dotenv()

API_KEY = os.getenv("BACKLOG_API_KEY")
SPACE_ID = os.getenv("BACKLOG_SPACE_ID")

TYPE_LABELS = {
    1: "課題の追加",
    2: "課題の更新",
    3: "課題にコメント",
    4: "課題の削除",
    5: "Wikiを追加",
    6: "Wikiを更新",
    7: "Wikiを削除",
    8: "共有ファイルを追加",
    9: "共有ファイルを更新",
    10: "共有ファイルを削除",
    11: "Subversionコミット",
    12: "GITプッシュ",
    13: "GITリポジトリ作成",
    14: "課題をまとめて更新",
    15: "ユーザーがプロジェクトに参加",
    16: "ユーザーがプロジェクトから脱退",
    17: "コメントにお知らせを追加",
    18: "プルリクエストの追加",
    19: "プルリクエストの更新",
    20: "プルリクエストにコメント",
    21: "プルリクエストの削除",
    22: "マイルストーンの追加",
    23: "マイルストーンの更新",
    24: "マイルストーンの削除",
    25: "グループがプロジェクトに参加",
    26: "グループがプロジェクトから脱退"
}

class ActivityResponse(BaseModel):
    id: int
    summary: Optional[str] = None
    project_name: str
    user_name: str
    type: int
    created: datetime
    type_label: str

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

class BacklogAPIClient:
    def __init__(self, api_key: str, space_id: str):
        self.api_key = api_key
        self.space_id = space_id

    def get(self, endpoint: str, params: Optional[dict] = None) -> List[dict]:
        if params is None:
            params = {}
        params["apiKey"] = self.api_key
        url = f"https://{self.space_id}.backlog.com/api/v2/{endpoint}"
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()

class ActivityService:
    def __init__(self, client: BacklogAPIClient):
        self.client = client

    def matches(self, item: dict, keyword: str) -> bool:
        item_id = str(item.get("id"))
        item_type = str(item.get("type"))
        summary = str(item.get("content", {}).get("summary", ""))
        project_name = str(item.get("project", {}).get("name"))
        user_name = str(item.get("createdUser", {}).get("name"))

        text_fields = [item_id, item_type, summary, project_name, user_name]

        for field in text_fields:
            if keyword.lower() in field.lower():
                return True
        return False

    def get_activities(self, keyword: str = "", offset: int = 0, count: int = 100) -> List[ActivityResponse]:
    #     url = f"https://{self.space_id}.backlog.com/api/v2/space/activities"
    #     response = requests.get(url, params={"apiKey": self.api_key})
    #     response.raise_for_status()
    #     all_activities = response.json()

        all_activities = self.client.get("space/activities")

        if keyword:
            filtered = []
            for a in all_activities:
                if self.matches(a, keyword):
                    filtered.append(a)
        else:
            filtered = all_activities

        paginated = filtered[offset:offset + count]

        result = []
        for a in paginated:
            try:
                result.append(ActivityResponse(
                    id=a["id"],
                    project_name=a["project"]["name"],
                    summary=a.get("content", {}).get("summary"),
                    type=a["type"],
                    user_name=a["createdUser"]["name"],
                    created=a["created"],
                    type_label=TYPE_LABELS.get(a["type"], f"種別不明 ({a['type']})")
                ))
            except (KeyError, TypeError) as e:
                logger.warning(f"必須フィールドが欠落しているためアクティビティをスキップしました(Skipping invalid activity due to missing field): {e} - {a}")
                continue
        return result
client = BacklogAPIClient(API_KEY, SPACE_ID)
activity_service = ActivityService(client)


@app.get("/activities", response_model=List[ActivityResponse])
def get_activities(
    keyword: str = Query(default=""),
    offset: int = Query(default=0),
    count: int = Query(default=100)
):
    return activity_service.get_activities(keyword=keyword, offset=offset, count=count)