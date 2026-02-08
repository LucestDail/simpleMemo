# Docker로 서버 설치 및 실행 가이드

Node.js를 로컬에 설치하지 않고 Docker만으로 e202sa-board 서버를 실행하는 방법입니다.

---

## 1. Docker 설치

### Windows

1. [Docker Desktop for Windows](https://docs.docker.com/desktop/install/windows-install/) 에서 설치 파일 다운로드
2. 설치 후 PC 재시작
3. WSL 2 사용 권장 (설치 시 옵션에서 선택)
4. 터미널에서 확인:
   ```powershell
   docker --version
   docker compose version
   ```

### macOS

1. [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/) (Apple Silicon / Intel 선택)
2. 설치 후 상단 메뉴에서 Docker 실행
3. 터미널에서 확인:
   ```bash
   docker --version
   docker compose version
   ```

### Linux (Ubuntu/Debian)

```bash
# 저장소 추가 및 Docker 엔진 설치
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod 644 /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
# 로그아웃 후 다시 로그인
```

---

## 2. e202sa-board 이미지 빌드 및 실행

프로젝트 루트(`e202sa-board/`)에서:

```bash
# 이미지 빌드 + 컨테이너 실행 (백그라운드)
docker compose up -d

# 로그 확인
docker compose logs -f
```

- **컨트롤러**: http://localhost:3000  
- **블랙보드**: http://localhost:3000/board  

내부망에서 접속하려면 `localhost` 대신 **해당 PC의 IP** (예: `http://192.168.0.10:3000`)로 접속합니다.

---

## 3. 데이터 유지 (볼륨)

`docker-compose.yml`에서 `./data`를 컨테이너의 `/app/data`에 마운트해 두었습니다.  
메모 데이터(`memo.json`)는 호스트의 `data/` 폴더에 저장되므로, 컨테이너를 지워도 데이터는 남습니다.

---

## 4. 종료 및 재시작

```bash
# 종료
docker compose down

# 재시작
docker compose up -d
```

---

## 5. 문제 해결

| 현상 | 확인 사항 |
|------|-----------|
| 포트 3000 사용 중 | `docker compose down` 후 다른 프로그램에서 3000 사용 여부 확인 |
| 빌드 실패 | `docker compose build --no-cache` 후 다시 `docker compose up -d` |
| 접속 안 됨 | 방화벽에서 3000 포트 허용, 같은 LAN인지 확인 |

Node.js를 직접 설치해 사용하려면 루트의 **README.md**와 **scripts/install.sh**를 참고하면 됩니다.
