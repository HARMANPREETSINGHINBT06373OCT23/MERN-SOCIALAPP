import { useEffect, useState } from "react";
import api from "../services/api";
import PostCard from "../components/PostCard";

export default function Home() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get("/posts/feed").then(res => setPosts(res.data));
  }, []);

  return (
    <div className="max-w-xl mx-auto">
      {posts.map(post => (
        <PostCard key={post._id} post={post} />
      ))}
    </div>
  );
}
