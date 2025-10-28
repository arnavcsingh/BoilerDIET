import moment from 'moment'
import { useEffect, useRef, useState } from 'react'
import { Dimensions, ScrollView, StyleSheet, Text, View } from 'react-native'
import Date from './Date'

const Calendar = ({ onSelectDate, selected }) => {
  const [dates, setDates] = useState([])
  const [scrollPosition, setScrollPosition] = useState(0)
  const [currentMonth, setCurrentMonth] = useState()
  const scrollRef = useRef(null)
  const ITEM_WIDTH = 80 + 10

  const getDates = () => {
    const _dates = []
    for (let i = -10; i < 10; i++) {
      const date = moment().add(i, 'days')
      _dates.push(date)
    }
    setDates(_dates)
  }

  useEffect(() => {
    getDates()
  }, [])
  useEffect(() => {
    if (!dates || dates.length === 0) return
    const todayStr = moment().format('YYYY-MM-DD')
    const index = dates.findIndex(d => moment(d).format('YYYY-MM-DD') === todayStr)
    if (index === -1) return

    const screenWidth = Dimensions.get('window').width
    const offset = Math.max(0, index * ITEM_WIDTH - ((screenWidth-30) / 2 - ITEM_WIDTH / 2))

    if (scrollRef.current && scrollRef.current.scrollTo) {
      scrollRef.current.scrollTo({ x: offset, animated: false })
    }
  }, [dates])

  return (
    <>
      <View style={styles.centered}>
        <Text style={styles.title}>September</Text>
      </View>
      <View style={styles.dateSection}>
        <View style={styles.scroll}>
          <ScrollView
            horizontal
              showsHorizontalScrollIndicator={false}
              ref={scrollRef}
          >
            {dates.map((date, index) => (
              <Date
                key={index}
                date={date}
                onSelectDate={onSelectDate}
                selected={selected}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </>
  )
}

export default Calendar

const styles = StyleSheet.create({
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  dateSection: {
    width: '100%',
    padding: 20,
  },
  scroll: {
    height: 150,
  },
})