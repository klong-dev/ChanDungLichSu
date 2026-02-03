export type GamePhase = 'lobby' | 'drawing' | 'voting' | 'presentation'

export interface Player {
  id: string
  nickname: string
  isAdmin: boolean
  isObserver?: boolean  // Admin is observer, does not draw
  assignedTopic?: string
  artwork?: string // base64 canvas data
  score?: number // points from voting
  votedPairs?: string[] // track which pairs this player has voted on (format: "id1-id2")
}

export interface HistoricalFigure {
  id: string
  name: string
  biography: string
  connectionToHoChiMinh: string
  imageHint?: string
}

export interface Session {
  id: string
  code: string
  phase: GamePhase
  players: Player[]
  selectedTopics: HistoricalFigure[]
  drawingTimeSeconds: number
  startedAt?: number
}

// Historical figures data
export const HISTORICAL_FIGURES: HistoricalFigure[] = [
  {
    id: '1',
    name: 'Phan Bội Châu',
    biography: 'Phan Bội Châu (1867-1940) là nhà cách mạng Việt Nam tiêu biểu đầu thế kỷ 20. Ông sáng lập phong trào Đông Du, đưa thanh niên sang Nhật Bản học tập để về cứu nước. Ông là tác giả của nhiều tác phẩm yêu nước như "Việt Nam vong quốc sử", "Hải ngoại huyết thư".',
    connectionToHoChiMinh: 'Nguyễn Ái Quốc rất kính trọng Phan Bội Châu và coi ông như bậc tiền bối. Tuy nhiên, Người nhận thấy con đường cầu viện Nhật Bản của cụ Phan không phù hợp, từ đó quyết định sang phương Tây tìm đường cứu nước mới.',
    imageHint: 'Cụ già râu dài, mặc áo dài truyền thống, dáng vẻ nghiêm nghị'
  },
  {
    id: '2', 
    name: 'Phan Châu Trinh',
    biography: 'Phan Châu Trinh (1872-1926) là nhà cách mạng theo khuynh hướng cải lương. Ông chủ trương dựa vào Pháp để canh tân đất nước, mở mang dân trí thông qua phong trào Duy Tân. Ông nổi tiếng với câu nói "Khai dân trí, chấn dân khí, hậu dân sinh".',
    connectionToHoChiMinh: 'Nguyễn Ái Quốc gặp gỡ Phan Châu Trinh tại Paris năm 1919. Hai người có nhiều trao đổi về con đường cứu nước. Tuy khác quan điểm (cụ Phan theo cải lương, Nguyễn Ái Quốc theo cách mạng), nhưng Người vẫn rất kính trọng tinh thần yêu nước của cụ.',
    imageHint: 'Người đàn ông trung niên, mặc vest kiểu Tây, đeo kính, vẻ mặt trí thức'
  },
  {
    id: '3',
    name: 'Nguyễn Thị Minh Khai',
    biography: 'Nguyễn Thị Minh Khai (1910-1941) là nữ chiến sĩ cộng sản kiên cường. Bà từng học tại Đại học Phương Đông (Moskva), tham gia lãnh đạo khởi nghĩa Nam Kỳ năm 1940. Bà hy sinh anh dũng khi mới 31 tuổi.',
    connectionToHoChiMinh: 'Nguyễn Thị Minh Khai là một trong những học trò xuất sắc của Nguyễn Ái Quốc. Bà được Người huấn luyện về lý luận cách mạng và trực tiếp giao nhiệm vụ quan trọng trong phong trào cộng sản Việt Nam.',
    imageHint: 'Phụ nữ trẻ, tóc ngắn, mặc áo bà ba, ánh mắt kiên định'
  },
  {
    id: '4',
    name: 'Trần Phú',
    biography: 'Trần Phú (1904-1931) là Tổng Bí thư đầu tiên của Đảng Cộng sản Việt Nam. Ông soạn thảo Luận cương chính trị năm 1930. Bị Pháp bắt và tra tấn dã man, ông hy sinh ở tuổi 27 với câu nói bất hủ "Hãy giữ vững chí khí chiến đấu!"',
    connectionToHoChiMinh: 'Trần Phú được Nguyễn Ái Quốc trực tiếp huấn luyện tại các lớp đào tạo cán bộ ở Quảng Châu. Người đánh giá cao năng lực và giao cho Trần Phú nhiệm vụ soạn Luận cương chính trị - văn kiện quan trọng định hướng cách mạng Việt Nam.',
    imageHint: 'Thanh niên trẻ, khuôn mặt gầy, tóc ngắn, ánh mắt sáng'
  },
  {
    id: '5',
    name: 'Lê Hồng Phong',
    biography: 'Lê Hồng Phong (1902-1942) là nhà lãnh đạo cách mạng kiên cường, từng giữ chức Tổng Bí thư Đảng. Ông học tại trường Không quân Liên Xô, là một trong những người sáng lập Mặt trận Dân chủ Đông Dương.',
    connectionToHoChiMinh: 'Lê Hồng Phong là đồng chí thân cận của Nguyễn Ái Quốc, cùng hoạt động trong Quốc tế Cộng sản. Người tin tưởng giao cho Lê Hồng Phong nhiều trọng trách trong việc xây dựng phong trào cách mạng.',
    imageHint: 'Người đàn ông trung niên, mặc quân phục, dáng vẻ cương nghị'
  },
  {
    id: '6',
    name: 'Võ Nguyên Giáp',
    biography: 'Võ Nguyên Giáp (1911-2013) là Đại tướng đầu tiên của Quân đội nhân dân Việt Nam. Ông là người chỉ huy trực tiếp chiến dịch Điện Biên Phủ lịch sử năm 1954, được thế giới mệnh danh là "Napoleon của Việt Nam".',
    connectionToHoChiMinh: 'Võ Nguyên Giáp gặp Nguyễn Ái Quốc năm 1940 tại Trung Quốc. Từ đó, ông trở thành cánh tay phải đắc lực của Bác Hồ trong việc xây dựng lực lượng vũ trang và chỉ huy các chiến dịch quân sự quan trọng.',
    imageHint: 'Người đàn ông trung niên, đội mũ cối, mặc quân phục, nụ cười hiền từ'
  },
  {
    id: '7',
    name: 'Phạm Văn Đồng',
    biography: 'Phạm Văn Đồng (1906-2000) là nhà cách mạng, Thủ tướng Việt Nam trong thời gian dài nhất (1955-1987). Ông là một trong những học trò xuất sắc và cộng sự gần gũi nhất của Chủ tịch Hồ Chí Minh.',
    connectionToHoChiMinh: 'Phạm Văn Đồng được Nguyễn Ái Quốc đào tạo từ những năm 1926 tại Quảng Châu. Ông là trợ thủ đắc lực của Bác Hồ trong suốt cuộc đời hoạt động cách mạng, đặc biệt trong công tác ngoại giao.',
    imageHint: 'Người đàn ông trung tuổi, đeo kính, mặc đại cán, vẻ mặt điềm đạm'
  },
  {
    id: '8',
    name: 'Trường Chinh',
    biography: 'Trường Chinh (1907-1988) là nhà lý luận cách mạng xuất sắc, từng giữ chức Tổng Bí thư Đảng nhiều nhiệm kỳ. Ông là tác giả cuốn "Cách mạng dân tộc dân chủ nhân dân Việt Nam".',
    connectionToHoChiMinh: 'Trường Chinh là một trong những cán bộ được Nguyễn Ái Quốc tin tưởng nhất. Người giao cho ông nhiệm vụ lãnh đạo Đảng trong những giai đoạn khó khăn và đóng góp quan trọng vào lý luận cách mạng Việt Nam.',
    imageHint: 'Người đàn ông trung niên, đeo kính dày, mặc áo đại cán, vẻ mặt trầm tư'
  },
  {
    id: '9',
    name: 'Tôn Đức Thắng',
    biography: 'Tôn Đức Thắng (1888-1980) là Chủ tịch nước Việt Nam (1969-1980), người kế nhiệm Hồ Chí Minh. Ông từng tham gia khởi nghĩa Hắc Hải năm 1919, là biểu tượng của tinh thần quốc tế vô sản.',
    connectionToHoChiMinh: 'Tôn Đức Thắng và Nguyễn Ái Quốc có mối quan hệ đồng chí gắn bó từ những năm 1920. Bác Hồ rất tin tưởng và đề cử Bác Tôn làm Phó Chủ tịch nước, người kế nhiệm xứng đáng của mình.',
    imageHint: 'Cụ già râu bạc, mặc áo đại cán giản dị, nụ cười hiền hậu'
  }
]
