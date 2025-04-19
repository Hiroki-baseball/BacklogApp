import React, { useState, useEffect } from "react";
import axios from "axios";

type Activity = {
  id: number;
  project_name: string;
  summary: string;
  user_name: string;
  type: number;
  created: string;
  type_label: string;
};

export default function FavoritesSearchApp() {
  const [keyword, setKeyword] = useState("");
  const [activityCache, setActivityCache] = useState<
    Record<number, Activity[]>
  >({});
  const [currentBatch, setCurrentBatch] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const count = 100;
  const itemsPerPage = 10;

  const fetchBatch = async (batchIndex: number) => {
    const offset = batchIndex * count;
    try {
      const res = await axios.get<Activity[]>(
        `http://localhost:8000/activities?keyword=${keyword}&offset=${offset}&count=${count}`
      );
      const newData = res.data;
      if (batchIndex === 0) setNotFound(newData.length === 0);
      setActivityCache((prev) => ({
        ...prev,
        [batchIndex]: newData,
      }));
    } catch (err) {
      console.error("API取得失敗", err);
    }
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      setActivityCache({});
      setCurrentBatch(0);
      setCurrentPage(1);
      fetchBatch(0);
      setHasSearched(true);
    }
  };

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const allResults = Object.values(activityCache).flat();

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentItems = allResults.slice(startIndex, endIndex);

  const favoriteItems = allResults.filter((item) =>
    favorites.includes(item.id)
  );
  const normalItems = currentItems.filter(
    (item) => !favorites.includes(item.id)
  );

  const groupItemsByProject = (items: Activity[]) => {
    return items.reduce((grouped: Record<string, Activity[]>, item) => {
      const projectName = item.project_name;
      if (!grouped[projectName]) grouped[projectName] = [];
      grouped[projectName].push(item);
      return grouped;
    }, {});
  };

  const favoriteItemsByProject = groupItemsByProject(favoriteItems);

  const totalPages = Math.ceil(allResults.length / itemsPerPage);

  const changePage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  useEffect(() => {
    if (!hasSearched) return;

    const neededBatch = Math.floor(((currentPage - 1) * itemsPerPage) / count);
    if (!activityCache[neededBatch]) {
      fetchBatch(neededBatch);
    }
  }, [currentPage, hasSearched]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">アプリケーション名</h1>
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={handleSearch}
        placeholder="検索キーワード入力"
        className="w-full border p-2"
      />

      {/* ★ お気に入り テーブル */}
      {favorites.length > 0 && (
        <>
          <h2 className="text-lg font-semibold mt-4">★ お気に入り</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto border-collapse">
              <thead>
                <tr className="bg-yellow-100">
                  <th className="px-4 py-2 border">ID</th>
                  <th className="px-4 py-2 border">件名</th>
                  <th className="px-4 py-2 border">プロジェクト</th>
                  <th className="px-4 py-2 border">種別</th>
                  <th className="px-4 py-2 border">登録者</th>
                  <th className="px-4 py-2 border">登録日</th>
                  <th className="px-4 py-2 border">お気に入り</th>
                </tr>
              </thead>
              <tbody>
                {favoriteItems.map((item) => (
                  <tr key={item.id} className="hover:bg-yellow-50">
                    <td className="px-4 py-2 border text-center">{item.id}</td>
                    <td className="px-4 py-2 border">
                      {item.summary ?? "件名なし"}
                    </td>
                    <td className="px-4 py-2 border">{item.project_name}</td>
                    <td className="px-4 py-2 border text-center">
                      {item.type_label}
                    </td>
                    <td className="px-4 py-2 border">{item.user_name}</td>
                    <td className="px-4 py-2 border">
                      {new Date(item.created).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 border text-center">
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() => toggleFavorite(item.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h2 className="text-lg font-semibold mt-4">🔍 検索結果</h2>
      {notFound ? (
        <p>一致する情報がありませんでした。</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">ID</th>
                <th className="px-4 py-2 border">件名</th>
                <th className="px-4 py-2 border">プロジェクト</th>
                <th className="px-4 py-2 border">種別</th>
                <th className="px-4 py-2 border">登録者</th>
                <th className="px-4 py-2 border">登録日</th>
                <th className="px-4 py-2 border">お気に入り</th>
              </tr>
            </thead>
            <tbody>
              {normalItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border text-center">{item.id}</td>
                  <td className="px-4 py-2 border">
                    {item.summary ?? "件名なし"}
                  </td>
                  <td className="px-4 py-2 border">{item.project_name}</td>
                  <td className="px-4 py-2 border text-center">
                    {item.type_label}
                  </td>
                  <td className="px-4 py-2 border">{item.user_name}</td>
                  <td className="px-4 py-2 border">
                    {new Date(item.created).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 border text-center">
                    <input
                      type="checkbox"
                      checked={favorites.includes(item.id)}
                      onChange={() => toggleFavorite(item.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ページネーションUI */}
      {hasSearched && allResults.length > 0 && totalPages > 0 && (
        <div className="mt-6 flex justify-center items-center gap-2">
          <button
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded"
          >
            ← 前へ
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => changePage(i + 1)}
              className={`px-3 py-1 rounded ${
                currentPage === i + 1 ? "bg-blue-500 text-white" : "bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded"
          >
            次へ →
          </button>
        </div>
      )}
    </div>
  );
}
